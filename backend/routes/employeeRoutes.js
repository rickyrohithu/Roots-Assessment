const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getAssignableEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

// Routes
router.route('/').get(getEmployees).post(createEmployee);
router.route('/options/assignable').get(getAssignableEmployees);
router.route('/:id').get(getEmployeeById).put(updateEmployee).delete(deleteEmployee);

module.exports = router;
