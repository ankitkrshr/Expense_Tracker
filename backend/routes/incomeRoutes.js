const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getIncomes, addIncome, deleteIncome } = require('../controllers/incomeController');

router.route('/').get(protect, getIncomes).post(protect, addIncome);
router.route('/:id').delete(protect, deleteIncome);

module.exports = router;
