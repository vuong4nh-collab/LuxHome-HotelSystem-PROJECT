const express = require('express');
const router = express.Router();
const carRentalsController = require('./car-rentals.controller');

// Public car browsing & searching routes
router.get('/', carRentalsController.getAllCars);
router.get('/search', carRentalsController.getAllCars);
router.get('/:id', carRentalsController.getCarById);

module.exports = router;
