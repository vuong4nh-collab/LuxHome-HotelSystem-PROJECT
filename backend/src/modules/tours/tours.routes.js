const express = require('express');
const router = express.Router();
const toursController = require('./tours.controller');

// Public tour browsing & searching routes
router.get('/', toursController.getAllTours);
router.get('/search', toursController.getAllTours);
router.get('/:id', toursController.getTourById);
router.get('/:id/schedules', toursController.getTourSchedules);

module.exports = router;
