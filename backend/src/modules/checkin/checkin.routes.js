const express = require('express');
const router = express.Router();
const { checkIn, checkOut } = require('./checkin.controller');
const { staffCheckIn } = require('../bookings/bookings.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

// Không dùng router.use(authenticate) — router mount tại /api sẽ chặn mọi /api/* (kể cả /api/ai/...)
router.post('/checkin/:bookingId', authenticate, authorize('Admin','Manager','Receptionist','Customer'), checkIn);
router.post('/staff/bookings/:bookingId/check-in', authenticate, authorize('Admin','Manager','Receptionist'), staffCheckIn);
router.post('/bookings/:bookingId/check-in', authenticate, authorize('Admin','Manager','Receptionist'), staffCheckIn);
router.post('/checkout/:bookingId', authenticate, authorize('Admin','Manager','Receptionist','Customer'), checkOut);

module.exports = router;
