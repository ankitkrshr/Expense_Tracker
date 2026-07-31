import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const BACKEND_URL = 'http://localhost:5000/api';

// DOM Elements
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const loader = document.getElementById('loader');
const mainContainer = document.getElementById('mainContainer');

const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');

const tabExpense = document.getElementById('tabExpense');
const tabIncome = document.getElementById('tabIncome');
const tCategory = document.getElementById('tCategory');
const transactionForm = document.getElementById('transactionForm');
const formError = document.getElementById('formError');

const transactionList = document.getElementById('transactionList');
const filterAll = document.getElementById('filterAll');
const filterIncome = document.getElementById('filterIncome');
const filterExpense = document.getElementById('filterExpense');

// State
let token = localStorage.getItem('token');
let currentType = 'expense'; // 'expense' or 'income'
let currentFilter = 'all'; // 'all', 'income', 'expense'
let transactions = []; // combined incomes and expenses

const categories = {
  expense: ['Food', 'Shopping', 'Travel', 'Bills', 'Education', 'Entertainment', 'Health', 'Others'],
  income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Others']
};

const showLoader = (show) => {
  if (show) loader.classList.remove('hidden');
  else loader.classList.add('hidden');
};

const updateCategories = () => {
  tCategory.innerHTML = '';
  categories[currentType].forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    tCategory.appendChild(opt);
  });
};

// Toggle Tabs
tabExpense.addEventListener('click', () => {
  currentType = 'expense';
  tabExpense.classList.add('active');
  tabIncome.classList.remove('active');
  document.getElementById('addBtn').textContent = 'Add Expense';
  updateCategories();
});

tabIncome.addEventListener('click', () => {
  currentType = 'income';
  tabIncome.classList.add('active');
  tabExpense.classList.remove('active');
  document.getElementById('addBtn').textContent = 'Add Income';
  updateCategories();
});

// Filters
filterAll.addEventListener('click', () => setFilter('all', filterAll));
filterIncome.addEventListener('click', () => setFilter('income', filterIncome));
filterExpense.addEventListener('click', () => setFilter('expense', filterExpense));

const setFilter = (type, btn) => {
  currentFilter = type;
  [filterAll, filterIncome, filterExpense].forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTransactions();
};

const fetchTransactions = async () => {
  if (!token) return;
  showLoader(true);
  try {
    const [incRes, expRes] = await Promise.all([
      fetch(`${BACKEND_URL}/incomes`, { headers: { 'Authorization': `Bearer ${token}` }}),
      fetch(`${BACKEND_URL}/expenses`, { headers: { 'Authorization': `Bearer ${token}` }})
    ]);

    const incomes = await incRes.json();
    const expenses = await expRes.json();

    const formattedIncomes = Array.isArray(incomes) ? incomes.map(t => ({...t, type: 'income'})) : [];
    const formattedExpenses = Array.isArray(expenses) ? expenses.map(t => ({...t, type: 'expense'})) : [];

    transactions = [...formattedIncomes, ...formattedExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    updateDashboard();
  } catch (err) {
    console.error("Error fetching data", err);
  } finally {
    showLoader(false);
  }
};

const updateDashboard = () => {
  const totalInc = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExp = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalInc - totalExp;

  totalIncomeEl.textContent = `+₹${totalInc.toFixed(2)}`;
  totalExpenseEl.textContent = `-₹${totalExp.toFixed(2)}`;
  totalBalanceEl.textContent = `₹${balance.toFixed(2)}`;
  
  if (balance < 0) totalBalanceEl.style.color = 'var(--danger)';
  else totalBalanceEl.style.color = 'var(--text-primary)';

  renderTransactions();
};

const renderTransactions = () => {
  transactionList.innerHTML = '';
  const filtered = transactions.filter(t => currentFilter === 'all' || t.type === currentFilter);

  if (filtered.length === 0) {
    transactionList.innerHTML = '<li style="text-align:center; padding: 20px; color: var(--text-secondary);">No transactions found</li>';
    return;
  }

  filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    
    const date = new Date(t.date).toLocaleDateString();
    const sign = t.type === 'income' ? '+' : '-';
    
    li.innerHTML = `
      <div class="t-info">
        <span class="t-category">${t.category}</span>
        <span class="t-date">${date} ${t.note ? ' - ' + t.note : ''}</span>
      </div>
      <div style="display:flex; align-items:center;">
        <span class="t-amount ${t.type}">${sign}₹${t.amount.toFixed(2)}</span>
        <button class="delete-btn" data-id="${t._id}" data-type="${t.type}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    `;
    transactionList.appendChild(li);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', deleteTransaction);
  });
};

const deleteTransaction = async (e) => {
  const btn = e.currentTarget;
  const id = btn.getAttribute('data-id');
  const type = btn.getAttribute('data-type');
  
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  try {
    await fetch(`${BACKEND_URL}/${type}s/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchTransactions();
  } catch (err) {
    console.error(err);
  }
};

transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');
  
  const amount = document.getElementById('tAmount').value;
  const date = document.getElementById('tDate').value;
  const category = tCategory.value;
  const note = document.getElementById('tNote').value;

  try {
    const res = await fetch(`${BACKEND_URL}/${currentType}s`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount: Number(amount), date, category, note })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to add transaction");
    }

    transactionForm.reset();
    document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
    fetchTransactions();
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  localStorage.removeItem('token');
  window.location.href = '../index.html';
});

// Init Auth Check
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userName.textContent = user.displayName || 'User';
    token = await user.getIdToken();
    localStorage.setItem('token', token);
    mainContainer.style.display = 'block';
    
    // Set default date
    document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
    updateCategories();
    fetchTransactions();
  } else {
    window.location.href = '../index.html';
  }
});
