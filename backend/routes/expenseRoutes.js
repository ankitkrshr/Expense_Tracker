const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getExpenses, addExpense, deleteExpense } = require('../controllers/expenseController');

router.route('/').get(protect, getExpenses).post(protect, addExpense);
router.route('/:id').delete(protect, deleteExpense);

module.exports = router;
