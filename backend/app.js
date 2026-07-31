const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(cors()); // Allow requests from our frontend
app.use(express.json()); // Parse incoming JSON data

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Expense Tracker API' });
});

module.exports = app;
