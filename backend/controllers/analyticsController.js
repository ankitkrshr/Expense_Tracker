const Expense = require('../models/Expense');
const Income = require('../models/Income');

// Helper to build date match for aggregation
const buildDateMatch = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { $gte: start, $lte: end };
};

// Helper: calculate % change, handling divide-by-zero
const calcChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// @desc    Monthly Income vs Expense for the last 6 months
// @route   GET /api/analytics/monthly?year=2025
// @access  Private
const getMonthly = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const uid = req.user.uid;

    const pipeline = () => [
      {
        $match: {
          userId: uid,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const [incomeData, expenseData] = await Promise.all([
      Income.aggregate(pipeline()),
      Expense.aggregate(pipeline()),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const toMap = (data) => {
      const m = {};
      data.forEach(d => { m[d._id] = d.total; });
      return m;
    };

    const incomeMap = toMap(incomeData);
    const expenseMap = toMap(expenseData);

    res.json({
      labels: months.map(m => new Date(year, m - 1).toLocaleString('en-IN', { month: 'short' })),
      income: months.map(m => incomeMap[m] || 0),
      expense: months.map(m => expenseMap[m] || 0),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Expense breakdown by category for a specific month
// @route   GET /api/analytics/categories?month=1&year=2025
// @access  Private
const getCategories = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const data = await Expense.aggregate([
      {
        $match: {
          userId: req.user.uid,
          date: buildDateMatch(year, month),
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json(data.map(d => ({ category: d._id, total: d.total, count: d.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Daily spending for a specific month
// @route   GET /api/analytics/daily?month=1&year=2025
// @access  Private
const getDaily = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const data = await Expense.aggregate([
      {
        $match: {
          userId: req.user.uid,
          date: buildDateMatch(year, month),
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const dayMap = {};
    data.forEach(d => { dayMap[d._id] = d.total; });

    res.json({
      labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      spending: Array.from({ length: daysInMonth }, (_, i) => dayMap[i + 1] || 0),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Analytics summary cards + month-over-month comparison
// @route   GET /api/analytics/summary?month=7&year=2025
// @access  Private
const getSummary = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const uid   = req.user.uid;

    // Previous month (handles Jan → Dec of prev year)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;

    const sumModel = async (Model, dateMatch) => {
      const rows = await Model.aggregate([
        { $match: { userId: uid, date: dateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return rows[0]?.total || 0;
    };

    const [
      curIncome, curExpense,
      prevIncome, prevExpense,
      topCategoryData,
    ] = await Promise.all([
      sumModel(Income,  buildDateMatch(year,     month)),
      sumModel(Expense, buildDateMatch(year,     month)),
      sumModel(Income,  buildDateMatch(prevYear, prevMonth)),
      sumModel(Expense, buildDateMatch(prevYear, prevMonth)),
      Expense.aggregate([
        { $match: { userId: uid, date: buildDateMatch(year, month) } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),
    ]);

    const curSavings  = curIncome  - curExpense;
    const prevSavings = prevIncome - prevExpense;

    res.json({
      income:  { amount: curIncome,  change: calcChange(curIncome,  prevIncome)  },
      expense: { amount: curExpense, change: calcChange(curExpense, prevExpense) },
      savings: { amount: curSavings, change: calcChange(curSavings, prevSavings) },
      topCategory: topCategoryData[0]
        ? { name: topCategoryData[0]._id, amount: topCategoryData[0].total }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Dashboard financial insights (aggregation-based)
// @route   GET /api/analytics/insights
// @access  Private
const getInsights = async (req, res) => {
  try {
    const uid = req.user.uid;
    const now  = new Date();
    const curMonth  = now.getMonth() + 1;
    const curYear   = now.getFullYear();
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear  = curMonth === 1 ? curYear - 1 : curYear;

    const curDateMatch  = buildDateMatch(curYear,  curMonth);
    const prevDateMatch = buildDateMatch(prevYear, prevMonth);
    const daysInMonth   = new Date(curYear, curMonth, 0).getDate();
    const daysPassed    = Math.min(now.getDate(), daysInMonth);

    const [
      topExpCat, topIncSrc,
      curExpTotal, prevExpTotal,
      curIncTotal, prevIncTotal,
      curFoodExp, prevFoodExp,
    ] = await Promise.all([
      // Highest spending category this month
      Expense.aggregate([
        { $match: { userId: uid, date: curDateMatch } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }, { $limit: 1 },
      ]),
      // Biggest income source this month
      Income.aggregate([
        { $match: { userId: uid, date: curDateMatch } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }, { $limit: 1 },
      ]),
      // Total expense this month
      Expense.aggregate([
        { $match: { userId: uid, date: curDateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Total expense last month
      Expense.aggregate([
        { $match: { userId: uid, date: prevDateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Total income this month
      Income.aggregate([
        { $match: { userId: uid, date: curDateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Total income last month (for savings rate)
      Income.aggregate([
        { $match: { userId: uid, date: prevDateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Food expense this month
      Expense.aggregate([
        { $match: { userId: uid, date: curDateMatch, category: 'Food' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Food expense last month
      Expense.aggregate([
        { $match: { userId: uid, date: prevDateMatch, category: 'Food' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const curExp  = curExpTotal[0]?.total  || 0;
    const prevExp = prevExpTotal[0]?.total || 0;
    const curInc  = curIncTotal[0]?.total  || 0;
    const prevInc = prevIncTotal[0]?.total || 0;
    const curFood  = curFoodExp[0]?.total  || 0;
    const prevFood = prevFoodExp[0]?.total || 0;

    const avgDailySpend  = daysPassed > 0 ? Math.round(curExp / daysPassed) : 0;
    const savingsRate    = curInc > 0 ? Math.round(((curInc - curExp) / curInc) * 100) : 0;
    const spendingChange = calcChange(curExp, prevExp);
    const foodChange     = calcChange(curFood, prevFood);

    const insights = [];

    if (topExpCat[0]) {
      insights.push({
        icon: '🔥',
        title: 'Highest Spending Category',
        value: topExpCat[0]._id,
        sub: `₹${topExpCat[0].total.toLocaleString('en-IN')} this month`,
      });
    }

    if (topIncSrc[0]) {
      insights.push({
        icon: '💡',
        title: 'Biggest Income Source',
        value: topIncSrc[0]._id,
        sub: `₹${topIncSrc[0].total.toLocaleString('en-IN')} this month`,
      });
    }

    if (daysPassed > 0) {
      insights.push({
        icon: '📊',
        title: 'Average Daily Spending',
        value: `₹${avgDailySpend.toLocaleString('en-IN')}/day`,
        sub: `Based on ${daysPassed} days this month`,
      });
    }

    insights.push({
      icon: '🎯',
      title: 'Monthly Savings Rate',
      value: `${savingsRate}%`,
      sub: curInc > 0 ? `Saving ₹${(curInc - curExp).toLocaleString('en-IN')} this month` : 'No income recorded this month',
    });

    if (prevExp > 0 || curExp > 0) {
      const trend = spendingChange < 0
        ? `You spent ${Math.abs(spendingChange)}% less than last month. Keep it up!`
        : spendingChange > 0
          ? `You spent ${spendingChange}% more than last month.`
          : 'Your spending is the same as last month.';
      insights.push({
        icon: spendingChange <= 0 ? '📉' : '📈',
        title: 'Spending Trend',
        value: spendingChange <= 0 ? `↓ ${Math.abs(spendingChange)}%` : `↑ ${spendingChange}%`,
        sub: trend,
      });
    }

    if (curFood > 0 && prevFood > 0 && foodChange > 20) {
      insights.push({
        icon: '⚠️',
        title: 'Recommendation',
        value: 'Food Budget Alert',
        sub: `Your Food expenses increased by ${foodChange}%. Consider setting a monthly budget.`,
      });
    }

    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMonthly, getCategories, getDaily, getSummary, getInsights };

