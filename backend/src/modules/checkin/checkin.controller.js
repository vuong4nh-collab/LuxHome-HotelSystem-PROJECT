const { Booking, Room, RoomType, Customer, Invoice, Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');

// POST /api/checkin/:bookingId
const checkIn = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.bookingId, {
      include: [
        { model: Room, as: 'room' },
        { model: Customer, as: 'customer' },
      ],
    });
    if (!booking) throw createError('Booking not found', 404);
    const hotelBranchId = booking.hotel_branch_id || booking.room?.hotel_branch_id;
    if (!hotelBranchId) throw createError('Booking is not assigned to a hotel branch', 422);
    if (req.user?.role?.name === 'Customer') {
      const { Customer: CustomerModel } = require('../../models');
      const cust = await CustomerModel.findOne({ where: { user_id: req.user.id } });
      if (!cust || booking.customer_id !== cust.id) {
        throw createError('Bạn không có quyền check-in đơn đặt này', 403);
      }
    }
    if (!['Confirmed','Pending'].includes(booking.status)) {
      throw createError(`Cannot check in. Current status: ${booking.status}`, 400);
    }

    const now = new Date();

    // AUD-019: Cập nhật thông tin giấy tờ tùy thân thực tế nếu khách khai báo tại check-in
    const { id_number, special_requests } = req.body;
    if (id_number && booking.customer) {
      await booking.customer.update({ id_number: String(id_number).trim() });
    }

    const bookingUpdates = { status: 'CheckedIn', actual_checkin: now };
    if (special_requests) bookingUpdates.special_requests = special_requests;
    await booking.update(bookingUpdates);
    await booking.room.update({ status: 'Occupied' });

    // Create invoice (draft)
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(booking.id).padStart(5,'0')}`;
    const existingInvoice = await Invoice.findOne({ where: { booking_id: booking.id } });
    if (!existingInvoice) {
      await Invoice.create({
        booking_id: booking.id,
        hotel_branch_id: hotelBranchId,
        invoice_number: invoiceNumber,
        customer_id: booking.customer_id,
        room_charge: parseFloat(booking.room_price_total),
        status: 'Draft',
      });
    }

    // Notification
    await Notification.create({
      type: 'CheckIn',
      hotel_branch_id: hotelBranchId,
      title: 'Check-In thành công',
      message: `${booking.customer.full_name} đã check-in phòng ${booking.room.room_number}`,
      related_id: booking.id,
      related_type: 'booking',
    });

    req.io?.emit('checkin:completed', {
      bookingId: booking.id,
      room_number: booking.room.room_number,
      customer_name: booking.customer.full_name,
    });

    res.json({ success: true, message: 'Check-in successful', data: { bookingId: booking.id, actual_checkin: now } });
  } catch (err) { next(err); }
};

// POST /api/checkout/:bookingId
const checkOut = async (req, res, next) => {
  try {
    const { extra_fee = 0, extra_fee_note } = req.body;
    const booking = await Booking.findByPk(req.params.bookingId, {
      include: [
        { model: Room, as: 'room' },
        { model: Customer, as: 'customer' },
        { model: Invoice, as: 'invoice' },
      ],
    });
    if (!booking) throw createError('Booking not found', 404);
    const hotelBranchId = booking.hotel_branch_id || booking.room?.hotel_branch_id;
    if (!hotelBranchId) throw createError('Booking is not assigned to a hotel branch', 422);
    if (req.user?.role?.name === 'Customer') {
      const { Customer: CustomerModel } = require('../../models');
      const cust = await CustomerModel.findOne({ where: { user_id: req.user.id } });
      if (!cust || booking.customer_id !== cust.id) {
        throw createError('Bạn không có quyền check-out đơn đặt này', 403);
      }
    }
    if (booking.status !== 'CheckedIn') throw createError('Guest has not checked in', 400);

    const now = new Date();

    // AUD-009: Ràng buộc múi giờ Việt Nam (UTC+7) 12:00 trưa cho giờ trả phòng quy chuẩn
    const checkoutDateStr = typeof booking.checkout_date === 'string'
      ? booking.checkout_date.slice(0, 10)
      : new Date(booking.checkout_date).toISOString().slice(0, 10);
    const scheduledCheckout = new Date(`${checkoutDateStr}T12:00:00+07:00`);
    const extraHours = Math.max(0, Math.ceil((now.getTime() - scheduledCheckout.getTime()) / (1000 * 60 * 60)));

    const isStaff = req.user && ['Admin', 'Manager', 'Receptionist'].includes(req.user.role?.name);
    const sanitizedExtraFee = isStaff ? Math.max(0, parseFloat(extra_fee) || 0) : (extraHours > 0 ? extraHours * 50000 : 0);

    await booking.update({
      status: 'CheckedOut',
      actual_checkout: now,
      extended_hours: extraHours,
      extra_fee: sanitizedExtraFee,
    });

    // Update room to Cleaning
    await booking.room.update({ status: 'Cleaning' });

    // Create housekeeping task automatically (AUD-021: Gán đúng hotel_branch_id)
    const { HousekeepingTask } = require('../../models');
    await HousekeepingTask.create({
      room_id: booking.room_id,
      hotel_branch_id: hotelBranchId,
      task_type: 'Cleaning',
      priority: 'High',
      status: 'Pending',
      notes: `Auto-created after checkout of booking #${booking.id}`,
      created_by: req.user.id,
    });

    // AUD-017: Giá đặt phòng đã bao gồm thuế GTGT. Chỉ tính thêm thuế GTGT 10% cho phụ phí phát sinh thêm (nếu có)
    if (booking.invoice) {
      const extraFeeTax = Math.round(sanitizedExtraFee * 0.1);
      const totalAmount = parseFloat(booking.invoice.room_charge) +
                          parseFloat(booking.invoice.service_charge) +
                          sanitizedExtraFee + extraFeeTax -
                          parseFloat(booking.invoice.discount_amount);
      const taxAmount = Math.round(parseFloat(booking.invoice.room_charge) * 0.1 / 1.1) + extraFeeTax;
      await booking.invoice.update({
        extra_fee: sanitizedExtraFee,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'Issued',
        issued_at: now,
        due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    }

    req.io?.emit('checkout:completed', {
      bookingId: booking.id,
      room_number: booking.room.room_number,
    });

    res.json({
      success: true,
      message: 'Check-out successful. Housekeeping task created.',
      data: { bookingId: booking.id, actual_checkout: now, extended_hours: extraHours },
    });
  } catch (err) { next(err); }
};

module.exports = { checkIn, checkOut };
