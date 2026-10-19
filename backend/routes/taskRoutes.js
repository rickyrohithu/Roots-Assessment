const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  exportTasksCSV,
} = require('../controllers/taskController');

// Export CSV route (must be before /:id)
router.get('/export/csv', exportTasksCSV);

// Main tasks collection routes
router.route('/').get(getTasks).post(createTask);

// Status transition route
router.put('/:id/status', updateTaskStatus);

// Single task CRUD routes
router.route('/:id').get(getTaskById).put(updateTask).delete(deleteTask);

module.exports = router;
