const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword, logout, refresh } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');
const { rateLimit } = require('../../middlewares/rateLimiter');

// AUD-011: Rate limiting chống brute force và spam tài khoản
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: 'Quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  message: 'Quá nhiều yêu cầu đăng ký tài khoản từ địa chỉ IP này. Vui lòng thử lại sau.',
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
