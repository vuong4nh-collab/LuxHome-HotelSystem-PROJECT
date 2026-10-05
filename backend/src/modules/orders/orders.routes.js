const express = require('express');
const router = express.Router();
const ordersController = require('./orders.controller');
const { optionalAuth } = require('../../middlewares/auth');

router.use(optionalAuth);

// Checkout endpoint
router.post('/checkout', ordersController.checkout);

// Orders list & details
router.get('/', ordersController.getAllOrders);
router.get('/:id', ordersController.getOrderById);

// Order actions
router.post('/:id/cancel', ordersController.cancelOrder);
router.post('/:id/pay', ordersController.payOrder);

module.exports = router;
