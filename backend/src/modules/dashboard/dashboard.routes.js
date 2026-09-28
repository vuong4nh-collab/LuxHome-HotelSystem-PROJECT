const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);
router.use(authorize('Admin','Manager'));

router.get('/summary', ctrl.getSummary);
router.get('/revenue', ctrl.getRevenue);
router.get('/occupancy', ctrl.getOccupancy);
router.get('/room-stats', ctrl.getRoomStats);
router.get('/stats', ctrl.getStats);
router.get('/traffic', ctrl.getTraffic);
router.get('/social', ctrl.getSocial);

module.exports = router;
