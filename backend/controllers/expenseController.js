const Expense = require('../models/Expense');

// @desc    Get all expenses for a user (with search, filter, sort)
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const { search, startDate, endDate, category, sort } = req.query;
    const query = { userId: req.user.uid };

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Category filter
    if (category && category !== 'all') query.category = category;

    // Text search on note or category (case-insensitive)
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ note: regex }, { category: regex }];
    }

    // Sort options
    const sortMap = {
      newest: { date: -1 },
      oldest: { date: 1 },
      highest: { amount: -1 },
      lowest: { amount: 1 },
    };
    const sortOrder = sortMap[sort] || { date: -1 };

    const expenses = await Expense.find(query).sort(sortOrder);
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add new expense
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res) => {
  try {
    const { amount, category, date, note } = req.body;

    const expense = await Expense.create({
      userId: req.user.uid,
      amount,
      category,
      date,
      note,
    });

    res.status(201).json(expense);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.userId !== req.user.uid) return res.status(401).json({ message: 'User not authorized' });

    const { amount, category, date, note } = req.body;
    expense.amount = amount ?? expense.amount;
    expense.category = category ?? expense.category;
    expense.date = date ?? expense.date;
    expense.note = note ?? expense.note;

    const updated = await expense.save();
    res.status(200).json(updated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.userId !== req.user.uid) return res.status(401).json({ message: 'User not authorized' });

    await expense.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense };
