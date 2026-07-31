const Expense = require('../models/Expense');
const Income = require('../models/Income');

// @desc    Export transactions as CSV
// @route   GET /api/export/csv?type=all&startDate=&endDate=
// @access  Private
const exportCSV = async (req, res) => {
  try {
    const { type = 'all', startDate, endDate } = req.query;
    const uid = req.user.uid;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const baseQuery = (userId) => ({
      userId,
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    });

    let rows = [];

    if (type === 'all' || type === 'income') {
      const incomes = await Income.find(baseQuery(uid)).sort({ date: -1 });
      rows = rows.concat(incomes.map(t => ({
        date: new Date(t.date).toLocaleDateString('en-IN'),
        type: 'Income',
        category: t.category,
        amount: t.amount.toFixed(2),
        note: t.note || '',
      })));
    }

    if (type === 'all' || type === 'expense') {
      const expenses = await Expense.find(baseQuery(uid)).sort({ date: -1 });
      rows = rows.concat(expenses.map(t => ({
        date: new Date(t.date).toLocaleDateString('en-IN'),
        type: 'Expense',
        category: t.category,
        amount: t.amount.toFixed(2),
        note: t.note || '',
      })));
    }

    // Sort combined rows by date descending
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Build CSV string
    const header = 'Date,Type,Category,Amount (INR),Note,Generated At';
    const generatedAt = new Date().toLocaleString('en-IN');
    const csvBody = rows.map(r =>
      `"${r.date}","${r.type}","${r.category}","${r.amount}","${r.note.replace(/"/g, '""')}","${generatedAt}"`
    ).join('\n');

    const csv = `${header}\n${csvBody}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="trackify_transactions.csv"');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { exportCSV };
