const express = require('express');
const router = express.Router();
const ctrl = require('./rooms.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

// Public
router.get('/types', ctrl.getRoomTypes);
router.get('/available', ctrl.getAvailableRooms);
router.get('/', ctrl.getAllRooms);
router.get('/:id', ctrl.getRoomById);

// Staff only
router.use(authenticate);
router.post('/types', authorize('Admin','Manager'), ctrl.createRoomType);
router.post('/', authorize('Admin','Manager','Receptionist'), ctrl.createRoom);
router.put('/:id', authorize('Admin','Manager'), ctrl.updateRoom);
router.patch('/:id/status', authorize('Admin','Manager','Receptionist','Housekeeping'), ctrl.updateRoomStatus);
router.delete('/:id', authorize('Admin','Manager'), ctrl.deleteRoom);

module.exports = router;
