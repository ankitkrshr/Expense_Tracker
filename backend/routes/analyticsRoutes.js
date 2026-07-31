const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMonthly, getCategories, getDaily, getSummary, getInsights } = require('../controllers/analyticsController');

router.get('/monthly', protect, getMonthly);
router.get('/categories', protect, getCategories);
router.get('/daily', protect, getDaily);
router.get('/summary', protect, getSummary);
router.get('/insights', protect, getInsights);

module.exports = router;
