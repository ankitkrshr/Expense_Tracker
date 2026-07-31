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
      trim: true,
      enum: [
        'Food',
        'Travel',
        'Rent',
        'Shopping',
        'Entertainment',
        'Medical',
        'Education',
        'Bills',
        'Business',
        'Others',
        // Legacy categories kept for backward compatibility
        'Health',
      ],
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

// Index for efficient per-user queries sorted by date
expenseSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
