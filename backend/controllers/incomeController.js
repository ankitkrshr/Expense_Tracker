const Income = require('../models/Income');

// @desc    Get all incomes for a user (with search, filter, sort)
// @route   GET /api/incomes
// @access  Private
const getIncomes = async (req, res) => {
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

    const incomes = await Income.find(query).sort(sortOrder);
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

// @desc    Update income
// @route   PUT /api/incomes/:id
// @access  Private
const updateIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) return res.status(404).json({ message: 'Income not found' });
    if (income.userId !== req.user.uid) return res.status(401).json({ message: 'User not authorized' });

    const { amount, category, date, note } = req.body;
    income.amount = amount ?? income.amount;
    income.category = category ?? income.category;
    income.date = date ?? income.date;
    income.note = note ?? income.note;

    const updated = await income.save();
    res.status(200).json(updated);
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
    if (!income) return res.status(404).json({ message: 'Income not found' });
    if (income.userId !== req.user.uid) return res.status(401).json({ message: 'User not authorized' });

    await income.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getIncomes, addIncome, updateIncome, deleteIncome };
