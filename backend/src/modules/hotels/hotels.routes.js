const express = require('express');
const router = express.Router();
const ctrl = require('./hotels.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.get('/chains', ctrl.getChains);
router.get('/hotels', ctrl.getHotels);
router.get('/branches', ctrl.getBranches);

router.use(authenticate);
router.post('/chains', authorize('ChainAdmin', 'Admin'), ctrl.createChain);
router.post('/hotels', authorize('ChainAdmin', 'Admin', 'PropertyManager'), ctrl.createHotel);
router.post('/branches', authorize('ChainAdmin', 'Admin', 'PropertyManager'), ctrl.createBranch);

module.exports = router;
