const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');

// @desc    Sync user from Firebase to MongoDB
// @route   POST /api/users/sync
// @access  Private
const syncUser = async (req, res) => {
  try {
    const { uid, name, email } = req.user;
    let user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        name: name || req.body.name || 'Anonymous User',
        email: email || req.body.email,
      });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile with financial stats
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const user = await User.findOne({ firebaseUid: uid });

    const [incomeStats, expenseStats] = await Promise.all([
      Income.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalIncome = incomeStats[0]?.total || 0;
    const totalExpense = expenseStats[0]?.total || 0;
    const incomeCount = incomeStats[0]?.count || 0;
    const expenseCount = expenseStats[0]?.count || 0;

    // Monthly savings (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthIncome, monthExpense] = await Promise.all([
      Income.aggregate([
        { $match: { userId: uid, date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { userId: uid, date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const monthlySavings = (monthIncome[0]?.total || 0) - (monthExpense[0]?.total || 0);

    res.status(200).json({
      name: user?.name || req.user.name || 'User',
      email: user?.email || req.user.email,
      photoURL: req.user.picture || null,
      createdAt: user?.createdAt || null,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      totalTransactions: incomeCount + expenseCount,
      monthlySavings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { syncUser, getProfile };
