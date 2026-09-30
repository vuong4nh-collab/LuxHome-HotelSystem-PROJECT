const express = require('express');
const router = express.Router();
const ctrl = require('./housekeeping.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/tasks', authorize('Admin','Manager','Receptionist','Staff'), ctrl.getAllTasks);
router.get('/tasks/:id', ctrl.getTaskById);
router.post('/tasks', authorize('Admin','Manager','Receptionist'), ctrl.createTask);
router.patch('/tasks/:id/status', authorize('Admin','Manager','Receptionist','Staff'), ctrl.updateTaskStatus);
router.put('/tasks/:id/assign', authorize('Admin','Manager'), ctrl.assignTask);

module.exports = router;
