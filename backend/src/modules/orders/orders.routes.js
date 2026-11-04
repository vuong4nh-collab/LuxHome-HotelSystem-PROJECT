const express = require('express');
const router = express.Router();
const ordersController = require('./orders.controller');
const { optionalAuth, authenticate, authorize } = require('../../middlewares/auth');

router.use(optionalAuth);

// Checkout endpoint (hỗ trợ cả khách vãng lai & thành viên)
router.post('/checkout', ordersController.checkout);

// Orders list & details
router.get('/', ordersController.getAllOrders);
router.get('/:id', ordersController.getOrderById);

// Order actions
router.post('/:id/cancel', ordersController.cancelOrder);

// AUD-003: /pay chỉ dành cho staff xác nhận thanh toán thủ công (Cash/POS tại quầy).
// Thanh toán online (QR/MoMo/VNPay) phải đi qua webhook từ cổng thanh toán thực.
router.post('/:id/pay', authenticate, authorize('Admin', 'Manager', 'Receptionist'), ordersController.payOrder);

module.exports = router;
