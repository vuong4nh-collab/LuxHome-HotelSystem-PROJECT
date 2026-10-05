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
    await booking.update({ status: 'CheckedIn', actual_checkin: now });
    await booking.room.update({ status: 'Occupied' });

    // Create invoice (draft)
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(booking.id).padStart(5,'0')}`;
    const existingInvoice = await Invoice.findOne({ where: { booking_id: booking.id } });
    if (!existingInvoice) {
      await Invoice.create({
        booking_id: booking.id,
        invoice_number: invoiceNumber,
        customer_id: booking.customer_id,
        room_charge: parseFloat(booking.room_price_total),
        status: 'Draft',
      });
    }

    // Notification
    await Notification.create({
      type: 'CheckIn',
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
    if (req.user?.role?.name === 'Customer') {
      const { Customer: CustomerModel } = require('../../models');
      const cust = await CustomerModel.findOne({ where: { user_id: req.user.id } });
      if (!cust || booking.customer_id !== cust.id) {
        throw createError('Bạn không có quyền check-out đơn đặt này', 403);
      }
    }
    if (booking.status !== 'CheckedIn') throw createError('Guest has not checked in', 400);

    const now = new Date();

    // Calculate any extra hours
    const scheduledCheckout = new Date(booking.checkout_date);
    scheduledCheckout.setHours(12, 0, 0, 0);
    const extraHours = Math.max(0, Math.ceil((now - scheduledCheckout) / (1000 * 60 * 60)));

    await booking.update({
      status: 'CheckedOut',
      actual_checkout: now,
      extended_hours: extraHours,
      extra_fee: parseFloat(extra_fee),
    });

    // Update room to Cleaning
    await booking.room.update({ status: 'Cleaning' });

    // Create housekeeping task automatically
    const { HousekeepingTask } = require('../../models');
    await HousekeepingTask.create({
      room_id: booking.room_id,
      task_type: 'Cleaning',
      priority: 'High',
      status: 'Pending',
      notes: `Auto-created after checkout of booking #${booking.id}`,
      created_by: req.user.id,
    });

    // Update invoice
    if (booking.invoice) {
      const totalAmount = parseFloat(booking.invoice.room_charge) +
                          parseFloat(booking.invoice.service_charge) +
                          parseFloat(extra_fee) -
                          parseFloat(booking.invoice.discount_amount);
      const taxAmount = totalAmount * 0.1;
      await booking.invoice.update({
        extra_fee: parseFloat(extra_fee),
        tax_amount: taxAmount,
        total_amount: totalAmount + taxAmount,
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
