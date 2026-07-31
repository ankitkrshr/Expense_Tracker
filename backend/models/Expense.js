const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Firebase UID
      required: true,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: [true, 'Please add an expense amount'],
      min: [0, 'Amount must be positive'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: [
        'Food',
        'Shopping',
        'Travel',
        'Bills',
        'Education',
        'Entertainment',
        'Health',
        'Others',
      ], // Validation: Only allows these exact categories!
    },
    date: {
      type: Date,
      required: [true, 'Please add a date'],
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxLength: [200, 'Note cannot be more than 200 characters'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Expense', expenseSchema);
