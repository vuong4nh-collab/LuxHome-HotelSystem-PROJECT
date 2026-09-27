const express = require('express');
const router = express.Router();
const ctrl = require('./bookings.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/my', ctrl.getMyBookings);  // Must be before /:id
router.get('/', authorize('Admin','Manager','Receptionist'), ctrl.getAllBookings);
router.get('/:id', ctrl.getBookingById);
router.post('/', ctrl.createBooking);
router.put('/:id/confirm', authorize('Admin','Manager','Receptionist'), ctrl.confirmBooking);
router.put('/:id/cancel', ctrl.cancelBooking);

module.exports = router;
