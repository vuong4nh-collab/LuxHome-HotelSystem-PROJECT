const { Op } = require('sequelize');
const { Room, RoomType, Booking } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/rooms
const getAllRooms = async (req, res, next) => {
  try {
    const { status, floor, type, hotel_branch_id, hotel_id, city } = req.query;
    const where = { is_active: true };
    if (status) where.status = status;
    if (floor) where.floor = parseInt(floor);
    if (hotel_branch_id) where.hotel_branch_id = parseInt(hotel_branch_id);
    if (hotel_id) {
      where.hotel_branch_id = where.hotel_branch_id || { [Op.in]: [1] };
    }

    const include = [{ model: RoomType, as: 'roomType' }];
    if (type) include[0].where = { name: type };

    const rooms = await Room.findAll({ where, include, order: [['room_number', 'ASC']] });
    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
};

// GET /api/rooms/available  — search available rooms for date range
const getAvailableRooms = async (req, res, next) => {
  try {
    const { checkin_date, checkout_date, num_guests, type, hotel_branch_id } = req.query;
    if (!checkin_date || !checkout_date) throw createError('checkin_date and checkout_date are required', 400);

    const restaurantBookingWhere = {
      status: { [Op.in]: ['Pending','Confirmed','CheckedIn'] },
      [Op.or]: [
        { checkin_date: { [Op.between]: [checkin_date, checkout_date] } },
        { checkout_date: { [Op.between]: [checkin_date, checkout_date] } },
        {
          checkin_date: { [Op.lte]: checkin_date },
          checkout_date: { [Op.gte]: checkout_date },
        },
      ],
    };
    if (hotel_branch_id) restaurantBookingWhere.hotel_branch_id = parseInt(hotel_branch_id);

    const conflictingBookings = await Booking.findAll({
      where: restaurantBookingWhere,
      attributes: ['room_id'],
    });
    const bookedRoomIds = conflictingBookings.map(b => b.room_id);

    const where = {
      is_active: true,
      status: { [Op.in]: ['Available'] },
      id: { [Op.notIn]: bookedRoomIds.length ? bookedRoomIds : [0] },
    };
    if (hotel_branch_id) where.hotel_branch_id = parseInt(hotel_branch_id);

    const typeWhere = {};
    if (num_guests) typeWhere.max_guests = { [Op.gte]: parseInt(num_guests) };
    if (type) typeWhere.name = type;

    const rooms = await Room.findAll({
      where,
      include: [{ model: RoomType, as: 'roomType', where: Object.keys(typeWhere).length ? typeWhere : undefined }],
      order: [['floor', 'ASC'], ['room_number', 'ASC']],
    });

    res.json({ success: true, data: rooms, count: rooms.length });
  } catch (err) { next(err); }
};

// GET /api/rooms/:id
const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{ model: RoomType, as: 'roomType' }],
    });
    if (!room) throw createError('Room not found', 404);
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
};

// POST /api/rooms
const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    const fullRoom = await Room.findByPk(room.id, { include: [{ model: RoomType, as: 'roomType' }] });
    res.status(201).json({ success: true, message: 'Room created', data: fullRoom });
  } catch (err) { next(err); }
};

// PUT /api/rooms/:id
const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) throw createError('Room not found', 404);
    await room.update(req.body);
    const updated = await Room.findByPk(room.id, { include: [{ model: RoomType, as: 'roomType' }] });
    res.json({ success: true, message: 'Room updated', data: updated });
  } catch (err) { next(err); }
};

// PATCH /api/rooms/:id/status
const updateRoomStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const room = await Room.findByPk(req.params.id);
    if (!room) throw createError('Room not found', 404);
    await room.update({ status, last_cleaned_at: status === 'Available' ? new Date() : room.last_cleaned_at });

    // Emit socket event
    req.io?.emit('room:statusChanged', { roomId: room.id, room_number: room.room_number, status });
    res.json({ success: true, message: 'Room status updated', data: { id: room.id, status } });
  } catch (err) { next(err); }
};

// DELETE /api/rooms/:id
const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) throw createError('Room not found', 404);
    await room.update({ is_active: false });
    res.json({ success: true, message: 'Room deactivated' });
  } catch (err) { next(err); }
};

// GET /api/rooms/types
const getRoomTypes = async (req, res, next) => {
  try {
    const types = await RoomType.findAll({ order: [['base_price', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
};

// POST /api/rooms/types
const createRoomType = async (req, res, next) => {
  try {
    const type = await RoomType.create(req.body);
    res.status(201).json({ success: true, message: 'Room type created', data: type });
  } catch (err) { next(err); }
};

module.exports = { getAllRooms, getAvailableRooms, getRoomById, createRoom, updateRoom, updateRoomStatus, deleteRoom, getRoomTypes, createRoomType };
