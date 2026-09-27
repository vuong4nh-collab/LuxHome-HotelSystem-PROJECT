const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, Customer } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { full_name, email, phone, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) throw createError('Email already registered', 409);

    const customerRole = await Role.findOne({ where: { name: 'Customer' } });
    if (!customerRole) throw createError('Role not configured', 500);

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      role_id: customerRole.id,
      full_name,
      email,
      phone,
      password_hash,
    });

    // Auto-create customer profile
    await Customer.create({ user_id: user.id, full_name, email, phone });

    const token = generateToken(user.id);
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: { id: user.id, full_name, email, role: 'Customer' },
      },
    });
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) throw createError('Invalid email or password', 401);
    if (!user.is_active) throw createError('Account has been deactivated', 403);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw createError('Invalid email or password', 401);

    await user.update({ last_login: new Date() });

    const token = generateToken(user.id);
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          role: user.role.name,
        },
      },
    });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let customerProfile = null;
    if (user.role.name === 'Customer') {
      customerProfile = await Customer.findOne({ where: { user_id: user.id } });
    }
    return res.json({
      success: true,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        role: user.role.name,
        is_active: user.is_active,
        last_login: user.last_login,
        customerProfile,
      },
    });
  } catch (err) { next(err); }
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) throw createError('Current password is incorrect', 400);

    const password_hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, changePassword };
