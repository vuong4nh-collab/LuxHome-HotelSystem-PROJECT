const express = require('express');
const router = express.Router();
const ctrl = require('./notifications.controller');
const { authenticate } = require('../../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.getMyNotifications);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markAsRead);

module.exports = router;
