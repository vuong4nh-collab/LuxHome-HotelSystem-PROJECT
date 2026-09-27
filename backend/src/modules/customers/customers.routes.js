const express = require('express');
const router = express.Router();
const ctrl = require('./customers.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('Admin','Manager','Receptionist'), ctrl.getAllCustomers);
router.get('/:id', ctrl.getCustomerById);
router.get('/:id/bookings', ctrl.getCustomerBookings);
router.post('/', authorize('Admin','Manager','Receptionist'), ctrl.createCustomer);
router.put('/:id', ctrl.updateCustomer);
router.delete('/:id', authorize('Admin','Manager'), ctrl.deleteCustomer);

module.exports = router;
