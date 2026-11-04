const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Role, Customer, AuthRefreshSession } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

const generateToken = (userId, sessionId) =>
  jwt.sign({ id: userId, sid: sessionId }, process.env.JWT_SECRET, {
    expiresIn: '30m',
  });
const ACCESS_COOKIE = 'luxhome_access';
const REFRESH_COOKIE = 'luxhome_refresh';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const readCookie = (req, name) => {
  const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
};

const cookieOptions = (path, maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path,
  maxAge,
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions('/api', 30 * 60 * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions('/api/auth', REFRESH_TTL_MS));
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, cookieOptions('/api'));
  res.clearCookie(REFRESH_COOKIE, cookieOptions('/api/auth'));
};

const createRefreshSession = async (userId) => {
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const session = await AuthRefreshSession.create({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
    expires_at: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { refreshToken, sessionId: session.id };
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { full_name, email, phone, password } = req.body;

    // AUD-024: Validate input phía server
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 100) {
      throw createError('Họ và tên phải có từ 2 đến 100 ký tự', 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(String(email).trim()) || String(email).trim().length > 100) {
      throw createError('Email không hợp lệ', 400);
    }
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 72) {
      throw createError('Mật khẩu phải có từ 8 đến 72 ký tự', 400);
    }
    if (phone && !/^\+?[0-9]{9,15}$/.test(String(phone).trim())) {
      throw createError('Số điện thoại không hợp lệ', 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) throw createError('Email already registered', 409);

    const customerRole = await Role.findOne({ where: { name: 'Customer' } });
    if (!customerRole) throw createError('Role not configured', 500);

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      role_id: customerRole.id,
      full_name: full_name.trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : '',
      password_hash,
    });

    // Auto-create customer profile
    await Customer.create({ user_id: user.id, full_name: full_name.trim(), email: cleanEmail, phone: phone || '' });

    const session = await createRefreshSession(user.id);
    setAuthCookies(res, generateToken(user.id, session.sessionId), session.refreshToken);
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: { id: user.id, full_name: user.full_name, email: user.email, role: 'Customer' },
      },
    });
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length === 0 || password.length > 72) {
      throw createError('Vui lòng cung cấp email và mật khẩu', 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({
      where: { email: cleanEmail },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) throw createError('Invalid email or password', 401);
    if (!user.is_active) throw createError('Account has been deactivated', 403);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw createError('Invalid email or password', 401);

    await user.update({ last_login: new Date() });

    const session = await createRefreshSession(user.id);
    setAuthCookies(res, generateToken(user.id, session.sessionId), session.refreshToken);
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
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
    if (!current_password || typeof new_password !== 'string' || new_password.length < 8 || new_password.length > 72) {
      throw createError('Mật khẩu mới phải có từ 8 đến 72 ký tự', 400);
    }
    const user = await User.findByPk(req.user.id);

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) throw createError('Current password is incorrect', 400);

    const password_hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash });
    await AuthRefreshSession.update(
      { revoked_at: new Date() },
      { where: { user_id: user.id, revoked_at: null } }
    );

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const refreshToken = readCookie(req, REFRESH_COOKIE);
    if (refreshToken) {
      await AuthRefreshSession.update(
        { revoked_at: new Date() },
        {
          where: {
            token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
            revoked_at: null,
          },
        }
      );
    }
    clearAuthCookies(res);
    return res.json({ success: true, message: 'Đăng xuất thành công' });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const currentToken = readCookie(req, REFRESH_COOKIE);
    if (!currentToken) throw createError('Refresh token required', 401);
    const tokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
    const session = await AuthRefreshSession.findOne({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() },
      },
    });
    if (!session) throw createError('Refresh token is invalid or expired', 401);

    const user = await User.findByPk(session.user_id);
    if (!user || !user.is_active) throw createError('User not found or deactivated', 401);

    const nextRefreshToken = crypto.randomBytes(48).toString('base64url');
    await session.update({
      token_hash: crypto.createHash('sha256').update(nextRefreshToken).digest('hex'),
      expires_at: new Date(Date.now() + REFRESH_TTL_MS),
    });
    setAuthCookies(res, generateToken(user.id, session.id), nextRefreshToken);
    return res.json({ success: true, message: 'Session refreshed' });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, changePassword, logout, refresh };
