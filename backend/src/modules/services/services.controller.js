const { Service, ServiceOrder, ServiceOrderItem, Booking, Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/services
const getAllServices = async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = { is_available: true };
    if (category) where.category = category;
    const services = await Service.findAll({ where, order: [['category','ASC'],['name','ASC']] });
    res.json({ success: true, data: services });
  } catch (err) { next(err); }
};

// GET /api/services/:id
const getServiceById = async (req, res, next) => {
  try {
    const s = await Service.findByPk(req.params.id);
    if (!s) throw createError('Service not found', 404);
    res.json({ success: true, data: s });
  } catch (err) { next(err); }
};

// POST /api/services
const createService = async (req, res, next) => {
  try {
    const s = await Service.create(req.body);
    res.status(201).json({ success: true, message: 'Service created', data: s });
  } catch (err) { next(err); }
};

// PUT /api/services/:id
const updateService = async (req, res, next) => {
  try {
    const s = await Service.findByPk(req.params.id);
    if (!s) throw createError('Service not found', 404);
    await s.update(req.body);
    res.json({ success: true, message: 'Service updated', data: s });
  } catch (err) { next(err); }
};

// DELETE /api/services/:id
const deleteService = async (req, res, next) => {
  try {
    const s = await Service.findByPk(req.params.id);
    if (!s) throw createError('Service not found', 404);
    await s.update({ is_available: false });
    res.json({ success: true, message: 'Service deactivated' });
  } catch (err) { next(err); }
};

// ── Service Orders ─────────────────────────────────────────────

// POST /api/services/orders
const createOrder = async (req, res, next) => {
  try {
    const { booking_id, items, notes } = req.body;
    if (!items || items.length === 0) throw createError('Order must have at least one item', 400);

    const booking = await Booking.findByPk(booking_id);
    if (!booking) throw createError('Booking not found', 404);
    if (booking.status !== 'CheckedIn') throw createError('Can only order services for checked-in bookings', 400);

    // Calculate total
    let total_amount = 0;
    const itemsWithPrices = [];
    for (const item of items) {
      const service = await Service.findByPk(item.service_id);
      if (!service || !service.is_available) throw createError(`Service ${item.service_id} not available`, 400);
      const unit_price = parseFloat(service.price);
      total_amount += unit_price * item.quantity;
      itemsWithPrices.push({ service_id: item.service_id, quantity: item.quantity, unit_price, notes: item.notes });
    }

    const order = await ServiceOrder.create({
      booking_id,
      requested_by: req.user.id,
      notes,
      total_amount,
      status: 'Pending',
    });

    await ServiceOrderItem.bulkCreate(itemsWithPrices.map(i => ({ ...i, service_order_id: order.id })));

    // Update invoice service charge
    const { Invoice } = require('../../models');
    const invoice = await Invoice.findOne({ where: { booking_id } });
    if (invoice) {
      const newServiceCharge = parseFloat(invoice.service_charge) + total_amount;
      const newTotal = parseFloat(invoice.room_charge) + newServiceCharge + parseFloat(invoice.extra_fee) - parseFloat(invoice.discount_amount);
      await invoice.update({ service_charge: newServiceCharge, total_amount: newTotal * 1.1, tax_amount: newTotal * 0.1 });
    }

    // Notify staff
    await Notification.create({
      type: 'ServiceOrder',
      title: 'Yêu cầu dịch vụ mới',
      message: `Booking #${booking_id}: Yêu cầu ${items.length} dịch vụ`,
      related_id: order.id,
      related_type: 'service_order',
    });
    req.io?.emit('service:newOrder', { orderId: order.id, booking_id });

    res.status(201).json({ success: true, message: 'Service order created', data: { orderId: order.id, total_amount } });
  } catch (err) { next(err); }
};

// GET /api/services/orders
const getAllOrders = async (req, res, next) => {
  try {
    const { status, booking_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (booking_id) where.booking_id = booking_id;

    const orders = await ServiceOrder.findAll({
      where,
      include: [{ model: ServiceOrderItem, as: 'items', include: [{ model: Service, as: 'service' }] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
};

// PATCH /api/services/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await ServiceOrder.findByPk(req.params.id);
    if (!order) throw createError('Order not found', 404);
    await order.update({ status, processed_by: req.user.id });
    req.io?.emit('service:orderUpdated', { orderId: order.id, status });
    res.json({ success: true, message: 'Order status updated', data: order });
  } catch (err) { next(err); }
};

module.exports = { getAllServices, getServiceById, createService, updateService, deleteService, createOrder, getAllOrders, updateOrderStatus };
