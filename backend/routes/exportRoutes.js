const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { exportCSV } = require('../controllers/exportController');

router.get('/csv', protect, exportCSV);

module.exports = router;
