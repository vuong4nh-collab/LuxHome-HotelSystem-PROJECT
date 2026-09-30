const express = require('express');
const router = express.Router();
const ctrl = require('./hotels.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.get('/chains', ctrl.getChains);
router.get('/cities', ctrl.getCities);
router.get('/locations', ctrl.getLocations);
router.get('/search', ctrl.searchHotels);
router.get('/hotels', ctrl.getHotels);
router.get('/branches', ctrl.getBranches);

router.use(authenticate);
router.post('/chains', authorize('Admin'), ctrl.createChain);
router.post('/hotels', authorize('Admin', 'Manager'), ctrl.createHotel);
router.post('/branches', authorize('Admin', 'Manager'), ctrl.createBranch);

module.exports = router;
