const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
