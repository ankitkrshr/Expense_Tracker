const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getExpenses, addExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');

router.route('/').get(protect, getExpenses).post(protect, addExpense);
router.route('/:id').put(protect, updateExpense).delete(protect, deleteExpense);

module.exports = router;
