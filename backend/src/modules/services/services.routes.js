const express = require('express');
const router = express.Router();
const ctrl = require('./services.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

// Public catalog
router.get('/', ctrl.getAllServices);
router.get('/orders', authenticate, authorize('Admin','Manager','Receptionist','Staff'), ctrl.getAllOrders);
router.get('/:id', ctrl.getServiceById);

router.use(authenticate);
router.post('/orders', ctrl.createOrder);
router.patch('/orders/:id/status', authorize('Admin','Manager','Receptionist','Staff'), ctrl.updateOrderStatus);
router.post('/', authorize('Admin','Manager'), ctrl.createService);
router.put('/:id', authorize('Admin','Manager'), ctrl.updateService);
router.delete('/:id', authorize('Admin','Manager'), ctrl.deleteService);

module.exports = router;
