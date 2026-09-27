const { HousekeepingTask, Room, RoomType, User, Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');
const { Op } = require('sequelize');

const include = [
  { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
  { model: User, as: 'assignee', attributes: ['id','full_name','email'] },
];

// GET /api/housekeeping/tasks
const getAllTasks = async (req, res, next) => {
  try {
    const { status, assigned_to, date } = req.query;
    const where = {};
    if (status) where.status = status;

    // Housekeeping staff only see their own tasks
    if (req.user.role.name === 'Housekeeping') {
      where.assigned_to = req.user.id;
    } else if (assigned_to) {
      where.assigned_to = assigned_to;
    }

    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      where.scheduled_at = { [Op.between]: [start, end] };
    }

    const tasks = await HousekeepingTask.findAll({
      where, include, order: [['priority','DESC'],['scheduled_at','ASC']],
    });
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
};

// GET /api/housekeeping/tasks/:id
const getTaskById = async (req, res, next) => {
  try {
    const task = await HousekeepingTask.findByPk(req.params.id, { include });
    if (!task) throw createError('Task not found', 404);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
};

// POST /api/housekeeping/tasks
const createTask = async (req, res, next) => {
  try {
    const { room_id, assigned_to, task_type, priority, scheduled_at, notes } = req.body;
    const task = await HousekeepingTask.create({
      room_id, assigned_to, task_type, priority, scheduled_at, notes,
      created_by: req.user.id,
    });

    // Notify assigned staff
    if (assigned_to) {
      await Notification.create({
        user_id: assigned_to,
        type: 'Housekeeping',
        title: 'Nhiệm vụ mới được giao',
        message: `Bạn có nhiệm vụ dọn phòng mới: ${task_type}`,
        related_id: task.id,
        related_type: 'housekeeping_task',
      });
      req.io?.to(`user_${assigned_to}`).emit('housekeeping:newTask', { taskId: task.id });
    }

    const fullTask = await HousekeepingTask.findByPk(task.id, { include });
    res.status(201).json({ success: true, message: 'Task created', data: fullTask });
  } catch (err) { next(err); }
};

// PATCH /api/housekeeping/tasks/:id/status
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const task = await HousekeepingTask.findByPk(req.params.id, {
      include: [{ model: Room, as: 'room' }],
    });
    if (!task) throw createError('Task not found', 404);

    const updates = { status };
    if (status === 'InProgress' && !task.started_at) updates.started_at = new Date();
    if (status === 'Done') {
      updates.completed_at = new Date();
      // Auto-update room status to Available
      await task.room.update({ status: 'Available', last_cleaned_at: new Date() });
      req.io?.emit('room:statusChanged', { roomId: task.room_id, status: 'Available' });
    }
    if (notes) updates.notes = notes;

    await task.update(updates);
    req.io?.emit('housekeeping:taskUpdated', { taskId: task.id, status });
    res.json({ success: true, message: 'Task status updated', data: task });
  } catch (err) { next(err); }
};

// PUT /api/housekeeping/tasks/:id/assign
const assignTask = async (req, res, next) => {
  try {
    const { assigned_to } = req.body;
    const task = await HousekeepingTask.findByPk(req.params.id);
    if (!task) throw createError('Task not found', 404);
    await task.update({ assigned_to });

    await Notification.create({
      user_id: assigned_to,
      type: 'Housekeeping',
      title: 'Nhiệm vụ được giao',
      message: `Bạn được giao nhiệm vụ dọn phòng`,
      related_id: task.id,
      related_type: 'housekeeping_task',
    });
    req.io?.to(`user_${assigned_to}`).emit('housekeeping:assigned', { taskId: task.id });

    res.json({ success: true, message: 'Task assigned', data: task });
  } catch (err) { next(err); }
};

module.exports = { getAllTasks, getTaskById, createTask, updateTaskStatus, assignTask };
