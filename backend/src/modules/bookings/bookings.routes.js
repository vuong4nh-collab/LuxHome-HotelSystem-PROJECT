const express = require('express');
const router = express.Router();
const ctrl = require('./bookings.controller');
const { authenticate, authorize, optionalAuth } = require('../../middlewares/auth');

// Public / Optional Auth: Tạo đặt phòng (hỗ trợ cả khách vãng lai và thành viên)
router.post('/', optionalAuth, ctrl.createBooking);

// Protected routes: Yêu cầu đăng nhập
router.use(authenticate);

router.get('/my', ctrl.getMyBookings);  // Must be before /:id
router.get('/', authorize('Admin','Manager','Receptionist'), ctrl.getAllBookings);
router.get('/:id', ctrl.getBookingById);
router.put('/:id/confirm', authorize('Admin','Manager','Receptionist'), ctrl.confirmBooking);
router.put('/:id/cancel', ctrl.cancelBooking);

module.exports = router;
