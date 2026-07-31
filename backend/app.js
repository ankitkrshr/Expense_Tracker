const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const exportRoutes = require('./routes/exportRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true), // allow all origins incl. file://
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json()); // Parse incoming JSON data

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Expense Tracker API' });
});

module.exports = app;
