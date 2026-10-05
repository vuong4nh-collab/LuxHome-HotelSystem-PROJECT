const express = require('express');
const ctrl = require('./hotels.controller');

const router = express.Router();

router.get('/cities', ctrl.getCities);
router.get('/cities/:cityId/locations', ctrl.getLocations);
router.get('/locations', ctrl.getLocations);
router.get('/locations/:locationId', ctrl.getLocationById);

module.exports = router;
