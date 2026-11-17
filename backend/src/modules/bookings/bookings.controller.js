const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Booking, Customer, Room, RoomType, Invoice, Notification, BookingQRToken, AuditLog, StayRegistration } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');
const { generateBookingCode, hashQrToken, generateQrToken } = require('../../utils/bookingCode');

const lookupIdempotency = new Map();

const safeModelCreate = async (Model, payload, options = {}) => {
  try {
    return await Model.create(payload, options);
  } catch (err) {
    const message = err?.parent?.message || err?.message || '';
    const missingColumns = [...message.matchAll(/Unknown column '([^']+)'/g)].map((match) => match[1]);
    if (missingColumns.length > 0) {
      const safePayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => !missingColumns.includes(key))
      );
      if (Object.keys(safePayload).length === 0) {
        return null;
      }
      return Model.create(safePayload, options);
    }

    if (/Unknown table|doesn't exist/.test(message)) {
      return null;
    }

    throw err;
  }
};

const normalizeLookupPayload = (reqBody = {}) => {
  const clean = { ...reqBody };
  if (typeof clean.guestName === 'string') clean.guestName = clean.guestName.trim();
  if (typeof clean.phone === 'string') clean.phone = clean.phone.trim();
  if (typeof clean.bookingCode === 'string') clean.bookingCode = clean.bookingCode.trim().toUpperCase();
  if (typeof clean.qrToken === 'string') clean.qrToken = clean.qrToken.trim();
  return clean;
};

const logAudit = async (actorId, action, entity, entityId, detail = {}) => {
  try {
    await AuditLog.create({ actor_id: actorId, action, entity, entity_id: entityId, detail });
  } catch (error) {
    // audit logs are non-blocking but should be best effort
  }
};

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

    // AUD-008: Chống IDOR — Khách hàng chỉ được xem booking của chính mình
    const isStaff = req.user && ['Admin', 'Manager', 'Receptionist'].includes(req.user.role?.name);
    if (!isStaff) {
      const cust = await Customer.findOne({ where: { user_id: req.user.id } });
      if (!cust || booking.customer_id !== cust.id) {
        throw createError('Bạn không có quyền truy cập đặt phòng này', 403);
      }
    }

    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      customer_id,
      room_id,
      room_type_id,
      hotel_branch_id,
      checkin_date,
      checkout_date,
      num_guests,
      special_requests,
      guest_name,
      guest_email,
      guest_phone,
      booker_name,
      booker_email,
      booker_phone,
    } = req.body;

    const normalizedGuestName = String(guest_name || booker_name || req.user?.full_name || 'Khách vãng lai').trim();
    const normalizedGuestEmail = String(guest_email || booker_email || req.user?.email || '').trim().toLowerCase();
    const normalizedGuestPhone = String(guest_phone || booker_phone || req.user?.phone || '').trim();
    const normalizedBookerName = String(booker_name || req.user?.full_name || normalizedGuestName).trim();
    const normalizedBookerEmail = String(booker_email || req.user?.email || normalizedGuestEmail).trim().toLowerCase();
    const normalizedBookerPhone = String(booker_phone || guest_phone || req.user?.phone || '').trim();

    let targetCustomerId = customer_id;
    if (!targetCustomerId) {
      if (normalizedGuestEmail) {
        let customer = await Customer.findOne({ where: { email: normalizedGuestEmail }, transaction });
        if (!customer) {
          customer = await Customer.create({
            full_name: normalizedGuestName,
            email: normalizedGuestEmail,
            phone: normalizedGuestPhone || '',
            id_type: 'Other',
            id_number: `GUEST-${Date.now()}`,
            nationality: 'Vietnamese',
          }, { transaction });
        }
        targetCustomerId = customer.id;
      } else if (req.user) {
        const cust = await Customer.findOne({ where: { user_id: req.user.id }, transaction });
        if (cust) targetCustomerId = cust.id;
      }
    }

    if (!targetCustomerId) throw createError('Thông tin khách hàng là bắt buộc', 400);

    let room = null;
    let resolvedRoomId = room_id;

    if (!resolvedRoomId && room_type_id) {
      room = await Room.findOne({
        where: { room_type_id, status: 'Available', is_active: true, hotel_branch_id: hotel_branch_id || 1 },
        include: [{ model: RoomType, as: 'roomType' }],
        order: [['id', 'ASC']],
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!room) throw createError('No available room found for the selected room type', 409);
      resolvedRoomId = room.id;
    }

    if (!resolvedRoomId) throw createError('Room selection is required', 400);

    room = await Room.findByPk(resolvedRoomId, {
      include: [{ model: RoomType, as: 'roomType' }],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!room) throw createError('Room not found', 404);
    if (room.status === 'Deactivated' || room.status === 'Maintenance') {
      throw createError('Room is not available', 400);
    }

    const conflict = await Booking.findOne({
      where: {
        room_id: resolvedRoomId,
        status: { [Op.in]: ['Pending','Confirmed','CheckedIn'] },
        [Op.or]: [
          { checkin_date: { [Op.between]: [checkin_date, checkout_date] } },
          { checkout_date: { [Op.between]: [checkin_date, checkout_date] } },
          { checkin_date: { [Op.lte]: checkin_date }, checkout_date: { [Op.gte]: checkout_date } },
        ],
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (conflict) throw createError('Room is already booked for the selected dates', 409);

    const cin = new Date(checkin_date);
    const cout = new Date(checkout_date);
    const nights = Math.ceil((cout - cin) / (1000 * 60 * 60 * 24));
    if (Number.isNaN(nights) || nights < 1) throw createError('Checkout must be after checkin', 400);

    const pricePerNight = parseFloat(room.roomType?.base_price ?? 0) || 0;
    const roomPriceTotal = pricePerNight * nights;
    const bookingCode = generateBookingCode();
    const policySnapshot = {
      checkInDate: checkin_date,
      checkOutDate: checkout_date,
      roomType: room.roomType?.name || room_type_id || 'room',
      numGuests: num_guests || 1,
      earlyCheckIn: 'subject to availability',
      lateCheckOut: 'subject to availability',
      cancellationPolicy: 'standard',
    };

    const bookingPayload = {
      customer_id: targetCustomerId,
      hotel_branch_id: hotel_branch_id || room.hotel_branch_id,
      room_id: resolvedRoomId,
      booking_code: bookingCode,
      booker_name: normalizedBookerName,
      booker_email: normalizedBookerEmail,
      booker_phone: normalizedBookerPhone,
      guest_name: normalizedGuestName,
      guest_email: normalizedGuestEmail || null,
      checkin_date,
      checkout_date,
      num_guests: num_guests || 1,
      special_requests,
      status: 'Confirmed',
      room_price_per_night: pricePerNight,
      room_price_total: roomPriceTotal,
      paid_amount: 0,
      policy_snapshot: policySnapshot,
      booking_source: req.user?.role?.name === 'Customer' ? 'Web' : 'Staff',
    };

    const booking = await safeModelCreate(Booking, bookingPayload, { transaction });

    const qrToken = generateQrToken();
    const qrValidFrom = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const qrValidUntil = new Date(new Date(checkout_date).getTime() + 24 * 60 * 60 * 1000);
    await safeModelCreate(BookingQRToken, {
      booking_id: booking.id,
      token_hash: hashQrToken(qrToken),
      valid_from: qrValidFrom,
      valid_until: qrValidUntil,
      used_at: null,
    }, { transaction });

    await room.update({ status: 'Reserved' }, { transaction });

    await Notification.create({
      user_id: null,
      type: 'Booking',
      title: 'Đặt phòng mới',
      message: `Có booking mới cho phòng ${room.room_number} (${checkin_date} → ${checkout_date})`,
      related_id: booking.id,
      related_type: 'booking',
    }, { transaction });

    await transaction.commit();

    req.io?.emit('booking:new', { bookingId: booking.id, room_number: room.room_number });

    const fullBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id','full_name','email','phone'] },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      bookingCode: booking?.booking_code || bookingCode,
      qrToken,
      data: fullBooking,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
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

    // AUD-008: Chống IDOR — Khách hàng chỉ được hủy booking của chính mình
    const isStaff = req.user && ['Admin', 'Manager', 'Receptionist'].includes(req.user.role?.name);
    if (!isStaff) {
      const cust = await Customer.findOne({ where: { user_id: req.user.id } });
      if (!cust || booking.customer_id !== cust.id) {
        throw createError('Bạn không có quyền hủy đặt phòng này', 403);
      }
    }

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

const lookupBooking = async (req, res, next) => {
  try {
    const payload = normalizeLookupPayload(req.body || {});
    const { qrToken, bookingCode, guestName, phone } = payload;

    if (!qrToken && !bookingCode && !(guestName && phone)) {
      throw createError('Vui lòng cung cấp qrToken, bookingCode hoặc guestName + phone', 400);
    }

    let booking = null;

    if (qrToken) {
      const tokenHash = hashQrToken(qrToken);
      const qrTokenRecord = await BookingQRToken.findOne({ where: { token_hash: tokenHash } });
      if (qrTokenRecord) {
        booking = await Booking.findByPk(qrTokenRecord.booking_id, {
          include: [
            { model: Customer, as: 'customer' },
            { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
          ],
        });
      }
    }

    if (!booking && bookingCode) {
      booking = await Booking.findOne({
        where: { booking_code: String(bookingCode).toUpperCase() },
        include: [
          { model: Customer, as: 'customer' },
          { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
        ],
      });
    }

    if (!booking && guestName && phone) {
      const customerList = await Customer.findAll({
        where: { phone: { [Op.like]: `%${phone}%` } },
        limit: 10,
      });
      const customerIds = customerList.map((item) => item.id);
      booking = await Booking.findOne({
        where: {
          [Op.or]: [
            { customer_id: { [Op.in]: customerIds.length ? customerIds : [-1] } },
            { guest_name: { [Op.like]: `%${guestName}%` } },
          ],
        },
        include: [
          { model: Customer, as: 'customer' },
          { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
        ],
        order: [['checkin_date', 'ASC']],
      });
    }

    if (!booking) throw createError('Không tìm thấy booking phù hợp', 404);

    await logAudit(req.user?.id || 0, 'LOOKUP', 'booking', booking.id, {
      source: qrToken ? 'qrToken' : bookingCode ? 'bookingCode' : 'guestNamePhone',
      guestName: booking.guest_name || booking.customer?.full_name,
    });

    res.json({
      success: true,
      data: {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        guestName: booking.guest_name || booking.customer?.full_name,
        phone: booking.customer?.phone || booking.booker_phone,
        status: booking.status,
        checkInDate: booking.checkin_date,
        checkOutDate: booking.checkout_date,
        room: booking.room ? { id: booking.room.id, room_number: booking.room.room_number } : null,
      },
    });
  } catch (err) { next(err); }
};

const getArrivals = async (req, res, next) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);
    const bookings = await Booking.findAll({
      where: { status: 'Confirmed', checkin_date: targetDate },
      include: [
        { model: Customer, as: 'customer', attributes: ['id','full_name','email','phone'] },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] },
      ],
      order: [['checkin_date', 'ASC']],
    });

    res.json({
      success: true,
      date: targetDate,
      data: bookings.map((booking) => ({
        id: booking.id,
        bookingCode: booking.booking_code,
        guestName: booking.guest_name || booking.customer?.full_name,
        roomType: booking.room?.roomType?.name || null,
        roomNumber: booking.room?.room_number || null,
        status: booking.status,
        paidAmount: booking.paid_amount ?? 0,
        roomAssigned: Boolean(booking.room_id),
      })),
    });
  } catch (err) { next(err); }
};

const staffCheckIn = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.bookingId || req.params.id);
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];
    const cacheKey = idempotencyKey ? `${req.user?.id || 'anon'}:${bookingId}:${idempotencyKey}` : null;

    if (cacheKey && lookupIdempotency.has(cacheKey)) {
      return res.json(lookupIdempotency.get(cacheKey));
    }

    const { rooms = [], guests = [], collectPayment = {} } = req.body || {};
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Room, as: 'room' },
      ],
    });

    if (!booking) throw createError('Booking not found', 404);
    if (booking.status !== 'Confirmed') throw createError(`Invalid status: ${booking.status}`, 400);

    const targetRoom = Array.isArray(rooms) && rooms[0] ? await Room.findByPk(rooms[0].roomId) : booking.room;
    if (!targetRoom) throw createError('ROOM_NOT_AVAILABLE', 400);
    if (targetRoom.status === 'Occupied' || targetRoom.status === 'Maintenance' || targetRoom.status === 'Cleaning') {
      throw createError('ROOM_NOT_AVAILABLE', 400);
    }

    const normalizedGuests = Array.isArray(guests) ? guests : [];
    if (!normalizedGuests.length) throw createError('GUEST_DOC_REQUIRED', 400);

    const requiredAmount = Number(collectPayment.amount || 0);
    if (requiredAmount > 0 && Number(booking.paid_amount || 0) + requiredAmount < Number(booking.room_price_total || 0)) {
      throw createError('PAYMENT_REQUIRED', 400);
    }

    const transaction = await sequelize.transaction();
    try {
      const lockedBooking = await Booking.findByPk(bookingId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      const lockedRoom = await Room.findByPk(targetRoom.id, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!lockedBooking || lockedBooking.status !== 'Confirmed') throw createError('INVALID_STATUS', 400);
      if (!lockedRoom || ['Occupied','Maintenance','Cleaning'].includes(lockedRoom.status)) {
        throw createError('ROOM_NOT_AVAILABLE', 400);
      }

      for (const guest of normalizedGuests) {
        const docNumber = String(guest.docNumber || '').trim();
        if (!docNumber && !guest.exceptionReason) {
          throw createError('GUEST_DOC_REQUIRED', 400);
        }
        const docNumberEncrypted = Buffer.from(docNumber || '').toString('base64');
        const docNumberIdx = crypto.createHmac('sha256', process.env.DOC_HASH_SECRET || 'hotel-doc-secret')
          .update(docNumber || '')
          .digest('hex');

        await StayRegistration.create({
          booking_id: lockedBooking.id,
          booking_room_id: Number(guest.bookingRoomId || rooms[0]?.bookingRoomId || 0),
          full_name: guest.fullName || lockedBooking.guest_name || lockedBooking.customer?.full_name,
          nationality: guest.nationality || 'VN',
          doc_type: guest.docType || 'CCCD',
          doc_number_enc: docNumberEncrypted,
          doc_number_idx: docNumberIdx,
          exception_reason: guest.exceptionReason || null,
          registered_by: req.user.id,
        }, { transaction });
      }

      await lockedRoom.update({ status: 'Occupied' }, { transaction });
      await lockedBooking.update({
        status: 'CheckedIn',
        actual_checkin: new Date(),
        paid_amount: Number(lockedBooking.paid_amount || 0) + Number(collectPayment.amount || 0),
      }, { transaction });

      await BookingQRToken.update({ used_at: new Date() }, {
        where: { booking_id: lockedBooking.id, used_at: null },
        transaction,
      });

      await logAudit(req.user.id, 'CHECK_IN', 'booking', lockedBooking.id, {
        roomId: lockedRoom.id,
        guestCount: normalizedGuests.length,
        collectedAmount: Number(collectPayment.amount || 0),
      });

      const response = {
        success: true,
        message: 'Check-in successful',
        data: { bookingId: lockedBooking.id, status: 'CheckedIn', roomId: lockedRoom.id },
      };

      if (cacheKey) {
        lookupIdempotency.set(cacheKey, response);
      }

      await transaction.commit();
      res.status(200).json(response);
    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }
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

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  confirmBooking,
  cancelBooking,
  lookupBooking,
  getArrivals,
  staffCheckIn,
  getMyBookings,
  generateBookingCode,
  hashQrToken,
  generateQrToken,
};
