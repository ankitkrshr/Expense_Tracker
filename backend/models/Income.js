const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // We use String here because it will store the Firebase UID
      required: true,
      ref: 'User', // References the User model (optional but good practice)
    },
    amount: {
      type: Number,
      required: [true, 'Please add an income amount'],
      min: [0, 'Amount must be positive'], // Validation: cannot be negative
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      trim: true,
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

module.exports = mongoose.model('Income', incomeSchema);
