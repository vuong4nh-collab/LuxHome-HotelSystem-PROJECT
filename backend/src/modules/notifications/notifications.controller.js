const { Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/notifications
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    // Also include broadcasts (user_id = null)
    const broadcasts = await Notification.findAll({
      where: { user_id: null },
      order: [['created_at', 'DESC']],
      limit: 20,
    });
    res.json({ success: true, data: [...notifications, ...broadcasts].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)) });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const n = await Notification.findByPk(req.params.id);
    if (!n) throw createError('Notification not found', 404);
    await n.update({ is_read: true });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await Notification.update({ is_read: true }, { where: { user_id: req.user.id, is_read: false } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

module.exports = { getMyNotifications, markAsRead, markAllRead };
