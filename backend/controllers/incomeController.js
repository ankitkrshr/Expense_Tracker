const Income = require('../models/Income');

// @desc    Get all incomes for a user
// @route   GET /api/incomes
// @access  Private
const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user.uid }).sort({ date: -1 });
    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add new income
// @route   POST /api/incomes
// @access  Private
const addIncome = async (req, res) => {
  try {
    const { amount, category, date, note } = req.body;

    const income = await Income.create({
      userId: req.user.uid,
      amount,
      category,
      date,
      note,
    });

    res.status(201).json(income);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete income
// @route   DELETE /api/incomes/:id
// @access  Private
const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    // Make sure user owns income
    if (income.userId !== req.user.uid) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await income.deleteOne();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getIncomes,
  addIncome,
  deleteIncome,
};
