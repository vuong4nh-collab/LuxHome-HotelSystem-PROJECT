const { Invoice, InvoiceItem, Payment, Booking, Customer, Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/invoices
const getAllInvoices = async (req, res, next) => {
  try {
    const { status, customer_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Booking, as: 'booking', attributes: ['id','checkin_date','checkout_date','status'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
};

// GET /api/invoices/:id
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' },
        { model: Booking, as: 'booking', include: [{ model: Customer, as: 'customer' }] },
      ],
    });
    if (!invoice) throw createError('Invoice not found', 404);
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

// GET /api/invoices/booking/:bookingId
const getInvoiceByBooking = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      where: { booking_id: req.params.bookingId },
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' },
      ],
    });
    if (!invoice) throw createError('Invoice not found for this booking', 404);
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

// POST /api/invoices/:id/pay
const processPayment = async (req, res, next) => {
  try {
    const { amount, payment_method, transaction_ref, notes } = req.body;
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) throw createError('Invoice not found', 404);
    if (invoice.status === 'Paid') throw createError('Invoice already paid', 400);

    const payment = await Payment.create({
      invoice_id: invoice.id,
      amount: parseFloat(amount),
      payment_method: payment_method || 'Cash',
      transaction_ref,
      status: 'Success',
      processed_by: req.user.id,
      notes,
    });

    await invoice.update({ status: 'Paid' });

    // Notify customer
    await Notification.create({
      type: 'Payment',
      title: 'Thanh toán thành công',
      message: `Hóa đơn ${invoice.invoice_number} đã được thanh toán: ${amount.toLocaleString()} VNĐ`,
      related_id: invoice.id,
      related_type: 'invoice',
    });
    req.io?.emit('payment:success', { invoiceId: invoice.id, amount });

    res.json({ success: true, message: 'Payment processed successfully', data: payment });
  } catch (err) { next(err); }
};

// GET /api/invoices/:id/pdf (returns invoice data formatted for PDF rendering)
const getInvoicePrintData = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Payment, as: 'payments' },
        { model: Booking, as: 'booking', include: [{ model: Customer, as: 'customer' }] },
      ],
    });
    if (!invoice) throw createError('Invoice not found', 404);
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

module.exports = { getAllInvoices, getInvoiceById, getInvoiceByBooking, processPayment, getInvoicePrintData };
