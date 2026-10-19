const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/dashboardController');

router.get('/', getDashboardMetrics);

module.exports = router;
