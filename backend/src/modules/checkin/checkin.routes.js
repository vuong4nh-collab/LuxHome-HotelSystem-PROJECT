const express = require('express');
const router = express.Router();
const { checkIn, checkOut } = require('./checkin.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

// Không dùng router.use(authenticate) — router mount tại /api sẽ chặn mọi /api/* (kể cả /api/ai/...)
router.post('/checkin/:bookingId', authenticate, authorize('Admin','Manager','Receptionist'), checkIn);
router.post('/checkout/:bookingId', authenticate, authorize('Admin','Manager','Receptionist'), checkOut);

module.exports = router;
