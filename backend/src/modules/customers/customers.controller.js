const { Op } = require('sequelize');
const { Customer, Booking, Room, RoomType, User } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/customers
const getAllCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = { is_active: true };
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { id_number: { [Op.like]: `%${search}%` } },
      ];
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Customer.findAndCountAll({
      where, limit: parseInt(limit), offset, order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (err) { next(err); }
};

// GET /api/customers/:id
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) throw createError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
};

// GET /api/customers/:id/bookings
const getCustomerBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: { customer_id: req.params.id },
      include: [{ model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] }],
      order: [['booking_date', 'DESC']],
    });
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};

// POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    const existing = await Customer.findOne({ where: { email: req.body.email } });
    if (existing) throw createError('Customer with this email already exists', 409);
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, message: 'Customer created', data: customer });
  } catch (err) { next(err); }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) throw createError('Customer not found', 404);

    // Customers can only update their own profile
    if (req.user.role.name === 'Customer') {
      const myProfile = await Customer.findOne({ where: { user_id: req.user.id } });
      if (myProfile?.id !== customer.id) throw createError('Forbidden', 403);
    }

    await customer.update(req.body);
    res.json({ success: true, message: 'Customer updated', data: customer });
  } catch (err) { next(err); }
};

// DELETE /api/customers/:id (soft delete)
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) throw createError('Customer not found', 404);
    await customer.update({ is_active: false });
    res.json({ success: true, message: 'Customer deactivated' });
  } catch (err) { next(err); }
};

module.exports = { getAllCustomers, getCustomerById, getCustomerBookings, createCustomer, updateCustomer, deleteCustomer };
