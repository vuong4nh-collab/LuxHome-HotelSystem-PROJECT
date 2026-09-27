const express = require('express');
const router = express.Router();
const ctrl = require('./invoices.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('Admin','Manager','Receptionist'), ctrl.getAllInvoices);
router.get('/booking/:bookingId', ctrl.getInvoiceByBooking);
router.get('/:id', ctrl.getInvoiceById);
router.get('/:id/print', ctrl.getInvoicePrintData);
router.post('/:id/pay', authorize('Admin','Manager','Receptionist'), ctrl.processPayment);

module.exports = router;
