const { Op } = require('sequelize');
const { Booking, Customer, Room, RoomType, Invoice, Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/bookings
const getAllBookings = async (req, res, next) => {
  try {
    const { status, customer_id, room_id, page = 1, limit = 20, from, to } = req.query;
    const where = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (room_id) where.room_id = room_id;
    if (from && to) where.checkin_date = { [Op.between]: [from, to] };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id','full_name','email','phone'] },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
      ],
      order: [['booking_date', 'DESC']],
      limit: parseInt(limit), offset,
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (err) { next(err); }
};

// GET /api/bookings/:id
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
        { model: Invoice, as: 'invoice' },
      ],
    });
    if (!booking) throw createError('Booking not found', 404);
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const { customer_id, room_id, checkin_date, checkout_date, num_guests, special_requests } = req.body;

    // Check room availability
    const room = await Room.findByPk(room_id, { include: [{ model: RoomType, as: 'roomType' }] });
    if (!room) throw createError('Room not found', 404);
    if (room.status === 'Deactivated' || room.status === 'Maintenance') {
      throw createError('Room is not available', 400);
    }

    // Check for conflicts
    const conflict = await Booking.findOne({
      where: {
        room_id,
        status: { [Op.in]: ['Pending','Confirmed','CheckedIn'] },
        [Op.or]: [
          { checkin_date: { [Op.between]: [checkin_date, checkout_date] } },
          { checkout_date: { [Op.between]: [checkin_date, checkout_date] } },
          { checkin_date: { [Op.lte]: checkin_date }, checkout_date: { [Op.gte]: checkout_date } },
        ],
      },
    });
    if (conflict) throw createError('Room is already booked for the selected dates', 409);

    // Calculate total nights & price
    const cin = new Date(checkin_date);
    const cout = new Date(checkout_date);
    const nights = Math.ceil((cout - cin) / (1000 * 60 * 60 * 24));
    if (nights < 1) throw createError('Checkout must be after checkin', 400);

    const price_per_night = parseFloat(room.roomType.base_price);
    const room_price_total = price_per_night * nights;

    const booking = await Booking.create({
      customer_id,
      room_id,
      checkin_date,
      checkout_date,
      num_guests: num_guests || 1,
      special_requests,
      status: 'Pending',
      room_price_per_night: price_per_night,
      room_price_total,
      booking_source: req.user?.role?.name === 'Customer' ? 'Web' : 'Staff',
    });

    // Update room status to Reserved
    await room.update({ status: 'Reserved' });

    // Create notification for staff
    await Notification.create({
      user_id: null,
      type: 'Booking',
      title: 'Đặt phòng mới',
      message: `Có booking mới cho phòng ${room.room_number} (${checkin_date} → ${checkout_date})`,
      related_id: booking.id,
      related_type: 'booking',
    });

    req.io?.emit('booking:new', { bookingId: booking.id, room_number: room.room_number });

    const fullBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id','full_name','email','phone'] },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
      ],
    });

    res.status(201).json({ success: true, message: 'Booking created successfully', data: fullBooking });
  } catch (err) { next(err); }
};

// PUT /api/bookings/:id/confirm
const confirmBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) throw createError('Booking not found', 404);
    if (booking.status !== 'Pending') throw createError('Booking cannot be confirmed', 400);

    await booking.update({ status: 'Confirmed', confirmed_by: req.user.id });
    req.io?.emit('booking:confirmed', { bookingId: booking.id });
    res.json({ success: true, message: 'Booking confirmed', data: booking });
  } catch (err) { next(err); }
};

// PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    const { cancellation_reason } = req.body;
    const booking = await Booking.findByPk(req.params.id, {
      include: [{ model: Room, as: 'room' }],
    });
    if (!booking) throw createError('Booking not found', 404);
    if (['CheckedIn','CheckedOut','Cancelled'].includes(booking.status)) {
      throw createError('Cannot cancel this booking', 400);
    }

    await booking.update({ status: 'Cancelled', cancellation_reason });
    // Free up the room
    if (booking.room) await booking.room.update({ status: 'Available' });

    req.io?.emit('booking:cancelled', { bookingId: booking.id, room_id: booking.room_id });
    res.json({ success: true, message: 'Booking cancelled', data: booking });
  } catch (err) { next(err); }
};

// GET /api/bookings/my (for logged-in customer)
const getMyBookings = async (req, res, next) => {
  try {
    const { Customer: CustomerModel } = require('../../models');
    const customerProfile = await CustomerModel.findOne({ where: { user_id: req.user.id } });
    if (!customerProfile) return res.json({ success: true, data: [] });

    const bookings = await Booking.findAll({
      where: { customer_id: customerProfile.id },
      include: [{ model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] }],
      order: [['booking_date', 'DESC']],
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};

module.exports = { getAllBookings, getBookingById, createBooking, confirmBooking, cancelBooking, getMyBookings };
