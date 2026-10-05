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

const getMyProfile = async (req, res, next) => {
  try {
    let customer = await Customer.findOne({ where: { user_id: req.user.id } });
    if (!customer) {
      customer = await Customer.findOne({ where: { email: req.user.email } });
      if (customer) {
        await customer.update({ user_id: req.user.id });
      } else {
        customer = await Customer.create({
          user_id: req.user.id,
          full_name: req.user.full_name || 'Khách hàng LuxStay',
          email: req.user.email,
          phone: req.user.phone || '',
          id_type: 'CCCD',
          id_number: `CCCD-${req.user.id}-${Date.now().toString().slice(-4)}`,
          nationality: 'Vietnamese',
          loyalty_points: 150,
        });
      }
    }
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
};

const updateMyProfile = async (req, res, next) => {
  try {
    let customer = await Customer.findOne({ where: { user_id: req.user.id } });
    if (!customer) {
      customer = await Customer.create({
        user_id: req.user.id,
        full_name: req.body.full_name || req.user.full_name,
        email: req.user.email,
        phone: req.body.phone || req.user.phone,
        id_type: req.body.id_type || 'CCCD',
        id_number: req.body.id_number || `CCCD-${req.user.id}`,
        nationality: req.body.nationality || 'Vietnamese',
        address: req.body.address,
        gender: req.body.gender,
        date_of_birth: req.body.date_of_birth,
      });
    } else {
      const allowedFields = ['full_name', 'phone', 'address', 'id_type', 'id_number', 'nationality', 'date_of_birth', 'gender'];
      const updateData = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      });
      await customer.update(updateData);
    }
    res.json({ success: true, message: 'Cập nhật hồ sơ thành công', data: customer });
  } catch (err) { next(err); }
};

module.exports = { getAllCustomers, getCustomerById, getCustomerBookings, createCustomer, updateCustomer, deleteCustomer, getMyProfile, updateMyProfile };

