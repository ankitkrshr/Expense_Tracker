import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { authFetch, formatCurrency, showToast, showLoader, debounce } from './utils.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryData, getIcon } from './categories.js';

// ===================== STATE =====================
let transactions = [];
let currentType = 'expense';
let deleteTarget = null;
let openMenuId = null; // tracks which 3-dot menu is open

// Filter state
let activeFilters = {
  datePreset: 'all', type: 'all', category: 'all',
  sort: 'newest', startDate: '', endDate: '', search: '',
};

// ===================== DOM REFS =====================
const userName        = document.getElementById('userName');
const greetingText    = document.getElementById('greetingText');
const mainContainer   = document.getElementById('mainContainer');
const transactionList = document.getElementById('transactionList');
const txCount         = document.getElementById('txCount');
const transactionForm = document.getElementById('transactionForm');
const formError       = document.getElementById('formError');
const tCategory       = document.getElementById('tCategory');
const tabExpense      = document.getElementById('tabExpense');
const tabIncome       = document.getElementById('tabIncome');
const addBtn          = document.getElementById('addBtn');
const searchInput     = document.getElementById('searchInput');
const toggleFiltersBtn  = document.getElementById('toggleFilters');
const advancedFilters   = document.getElementById('advancedFilters');
const filterType        = document.getElementById('filterType');
const filterCategory    = document.getElementById('filterCategory');
const filterSort        = document.getElementById('filterSort');
const filterStartDate   = document.getElementById('filterStartDate');
const filterEndDate     = document.getElementById('filterEndDate');

// Stat elements
const totalBalanceEl   = document.getElementById('totalBalance');
const totalIncomeEl    = document.getElementById('totalIncome');
const totalExpenseEl   = document.getElementById('totalExpense');
const monthlySavingsEl = document.getElementById('monthlySavings');

// Modals
const editModal      = document.getElementById('editModal');
const editModalClose = document.getElementById('editModalClose');
const editForm       = document.getElementById('editForm');
const editModalBadge = document.getElementById('editModalBadge');
const editError      = document.getElementById('editError');
const editCancelBtn  = document.getElementById('editCancelBtn');
const deleteModal    = document.getElementById('deleteModal');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const deleteCancelBtn  = document.getElementById('deleteCancelBtn');

// Insights
const insightsGrid = document.getElementById('insightsGrid');

// ===================== GREETING =====================
const setGreeting = () => {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning 👋' : h < 17 ? 'Good afternoon ☀️' : 'Good evening 🌙';
  if (greetingText) greetingText.textContent = greet;
};

// ===================== NAV TABS =====================
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    const page = tab.getAttribute('data-page');
    document.getElementById(`${page}Page`)?.classList.add('active');
    closeAllMenus();
    if (page === 'analytics') window.dispatchEvent(new Event('analyticsTabOpen'));
    if (page === 'profile')   window.dispatchEvent(new Event('profileTabOpen'));
  });
});

// ===================== CATEGORIES =====================
const populateCategories = (selectEl, type) => {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  selectEl.innerHTML = list.map(c =>
    `<option value="${c.value}">${c.icon} ${c.label}</option>`
  ).join('');
};

const populateFilterCategories = () => {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const unique = [...new Map(all.map(c => [c.value, c])).values()];
  filterCategory.innerHTML = `<option value="all">All Categories</option>` +
    unique.map(c => `<option value="${c.value}">${c.icon} ${c.label}</option>`).join('');
};

// ===================== FORM TYPE TOGGLE =====================
tabExpense.addEventListener('click', () => {
  currentType = 'expense';
  tabExpense.classList.add('active'); tabIncome.classList.remove('active');
  addBtn.textContent = 'Add Expense';
  populateCategories(tCategory, 'expense');
});

tabIncome.addEventListener('click', () => {
  currentType = 'income';
  tabIncome.classList.add('active'); tabExpense.classList.remove('active');
  addBtn.textContent = 'Add Income';
  populateCategories(tCategory, 'income');
});

// ===================== STATS UPDATE =====================
const updateStats = () => {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  totalIncomeEl.textContent  = `+${formatCurrency(income)}`;
  totalExpenseEl.textContent = `-${formatCurrency(expense)}`;
  totalBalanceEl.textContent = formatCurrency(balance);
  totalBalanceEl.style.color = balance < 0 ? 'var(--danger)' : 'var(--text)';

  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const mInc = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const mExp = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = mInc - mExp;
  if (monthlySavingsEl) {
    monthlySavingsEl.textContent = formatCurrency(savings);
    monthlySavingsEl.style.color = savings < 0 ? 'var(--danger)' : 'var(--warning)';
  }
};

// ===================== DATE PRESET FILTER =====================
const getDateRange = (preset) => {
  const now = new Date();
  let start = null, end = null;
  if (preset === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (preset === 'week') {
    const day = now.getDay();
    start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
    end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
  } else if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (preset === 'lastmonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }
  return { start, end };
};

// ===================== RENDER TRANSACTIONS =====================
const renderTransactions = () => {
  let filtered = [...transactions];

  if (activeFilters.type !== 'all') filtered = filtered.filter(t => t.type === activeFilters.type);

  if (activeFilters.datePreset !== 'all') {
    const { start, end } = getDateRange(activeFilters.datePreset);
    if (start) filtered = filtered.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
  }
  if (activeFilters.startDate)
    filtered = filtered.filter(t => new Date(t.date) >= new Date(activeFilters.startDate));
  if (activeFilters.endDate) {
    const end = new Date(activeFilters.endDate); end.setHours(23,59,59);
    filtered = filtered.filter(t => new Date(t.date) <= end);
  }
  if (activeFilters.category !== 'all') filtered = filtered.filter(t => t.category === activeFilters.category);
  if (activeFilters.search) {
    const q = activeFilters.search.toLowerCase();
    filtered = filtered.filter(t =>
      t.category.toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q) ||
      String(t.amount).includes(q)
    );
  }

  const sortMap = {
    newest:  (a, b) => new Date(b.date) - new Date(a.date),
    oldest:  (a, b) => new Date(a.date) - new Date(b.date),
    highest: (a, b) => b.amount - a.amount,
    lowest:  (a, b) => a.amount - b.amount,
  };
  filtered.sort(sortMap[activeFilters.sort] || sortMap.newest);

  if (txCount) txCount.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    transactionList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <h3>No transactions found</h3>
        <p>${activeFilters.search || activeFilters.datePreset !== 'all' || activeFilters.type !== 'all'
          ? 'Try adjusting your filters.'
          : 'Add your first transaction using the form on the left!'}</p>
      </div>`;
    return;
  }

  transactionList.innerHTML = '';
  filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', t._id);

    const catData = getCategoryData(t.category);
    const sign    = t.type === 'income' ? '+' : '-';
    const date    = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    li.innerHTML = `
      <div class="t-left">
        <div class="t-icon" style="background:${catData.bg}; color:${catData.color};">${catData.icon}</div>
        <div class="t-info">
          <span class="t-category" style="color:${catData.color};">${t.category}</span>
          <span class="t-meta">${date}${t.note ? ' · ' + t.note : ''}</span>
        </div>
      </div>
      <div class="t-right">
        <span class="t-amount ${t.type}">${sign}${formatCurrency(t.amount)}</span>
        <div class="action-menu-wrap">
          <button class="action-menu-btn" data-id="${t._id}" title="More actions">⋮</button>
          <div class="action-menu-dropdown hidden" id="menu-${t._id}">
            <button class="action-menu-item edit-item" data-id="${t._id}" data-type="${t.type}">✏️ Edit</button>
            <button class="action-menu-item duplicate-item" data-id="${t._id}" data-type="${t.type}">📋 Duplicate</button>
            <button class="action-menu-item danger delete-item" data-id="${t._id}" data-type="${t.type}">🗑️ Delete</button>
          </div>
        </div>
      </div>`;
    transactionList.appendChild(li);
  });

  // Attach 3-dot menu events
  document.querySelectorAll('.action-menu-btn').forEach(btn => btn.addEventListener('click', toggleMenu));
  document.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', (e) => { closeAllMenus(); openEditModal(e); }));
  document.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', (e) => { closeAllMenus(); openDeleteModal(e); }));
  document.querySelectorAll('.duplicate-item').forEach(btn => btn.addEventListener('click', (e) => { closeAllMenus(); duplicateTransaction(e); }));
};

// ===================== 3-DOT ACTION MENU =====================
const toggleMenu = (e) => {
  e.stopPropagation();
  const id = e.currentTarget.getAttribute('data-id');
  const menuEl = document.getElementById(`menu-${id}`);
  if (!menuEl) return;

  const isOpen = !menuEl.classList.contains('hidden');
  closeAllMenus();
  if (!isOpen) {
    menuEl.classList.remove('hidden');
    openMenuId = id;
  }
};

const closeAllMenus = () => {
  document.querySelectorAll('.action-menu-dropdown').forEach(m => m.classList.add('hidden'));
  openMenuId = null;
};

// Close menus when clicking outside
document.addEventListener('click', closeAllMenus);

// ===================== DUPLICATE TRANSACTION =====================
const duplicateTransaction = async (e) => {
  const id   = e.currentTarget.getAttribute('data-id');
  const type = e.currentTarget.getAttribute('data-type');
  const original = transactions.find(t => t._id === id);
  if (!original) return;

  try {
    const res = await authFetch(`/${type}s`, {
      method: 'POST',
      body: JSON.stringify({
        amount: original.amount,
        category: original.category,
        date: new Date().toISOString().split('T')[0], // today's date
        note: original.note ? `Copy of: ${original.note}` : 'Duplicate',
      }),
    });
    if (!res.ok) throw new Error('Failed to duplicate');
    await fetchTransactions();
    showToast('Transaction duplicated with today\'s date!', 'success');
  } catch (err) {
    showToast('Failed to duplicate transaction.', 'error');
  }
};

// ===================== FETCH ALL TRANSACTIONS =====================
const showTransactionSkeletons = () => {
  transactionList.innerHTML = Array(5).fill(`
    <li class="skeleton-item">
      <div style="display:flex;gap:12px;align-items:center;width:100%;">
        <div class="skeleton-line" style="width:42px;height:42px;border-radius:12px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton-line w60" style="margin-bottom:8px;"></div>
          <div class="skeleton-line w30"></div>
        </div>
        <div class="skeleton-line" style="width:80px;height:16px;"></div>
      </div>
    </li>`).join('');
};

const fetchTransactions = async () => {
  showTransactionSkeletons();
  try {
    const [incRes, expRes] = await Promise.all([
      authFetch('/incomes'),
      authFetch('/expenses'),
    ]);
    const incomes  = await incRes.json();
    const expenses = await expRes.json();
    const fInc = Array.isArray(incomes)  ? incomes.map(t  => ({ ...t, type: 'income' }))  : [];
    const fExp = Array.isArray(expenses) ? expenses.map(t => ({ ...t, type: 'expense' })) : [];
    transactions = [...fInc, ...fExp].sort((a, b) => new Date(b.date) - new Date(a.date));
    updateStats();
    renderTransactions();
  } catch (err) {
    console.error('Fetch error:', err);
    showToast('Failed to load transactions', 'error');
  }
};

// ===================== INSIGHTS =====================
const showInsightSkeletons = () => {
  if (!insightsGrid) return;
  insightsGrid.innerHTML = Array(4).fill(`
    <div class="insight-skeleton">
      <div class="insight-skeleton-icon"></div>
      <div style="flex:1;">
        <div class="insight-skeleton-line w40"></div>
        <div class="insight-skeleton-line w70"></div>
        <div class="insight-skeleton-line w90"></div>
      </div>
    </div>`).join('');
};

const loadInsights = async () => {
  if (!insightsGrid) return;
  showInsightSkeletons();
  try {
    const res = await authFetch('/analytics/insights');
    const insights = await res.json();

    if (!Array.isArray(insights) || insights.length === 0) {
      insightsGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1; padding:32px;">
          <div class="empty-state-icon">💡</div>
          <h3>No Insights Yet</h3>
          <p>Add more transactions to see personalized financial insights.</p>
        </div>`;
      return;
    }

    insightsGrid.innerHTML = insights.map(ins => `
      <div class="insight-card">
        <div class="insight-card-icon">${ins.icon}</div>
        <div class="insight-card-content">
          <div class="insight-card-title">${ins.title}</div>
          <div class="insight-card-value">${ins.value}</div>
          <div class="insight-card-sub">${ins.sub}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    insightsGrid.innerHTML = '';
  }
};

// ===================== ADD TRANSACTION =====================
transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');
  const amount   = document.getElementById('tAmount').value;
  const date     = document.getElementById('tDate').value;
  const category = tCategory.value;
  const note     = document.getElementById('tNote').value;

  try {
    const res = await authFetch(`/${currentType}s`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), date, category, note }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to add transaction');
    }
    transactionForm.reset();
    document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
    populateCategories(tCategory, currentType);
    await fetchTransactions();
    loadInsights(); // refresh insights after new transaction
    showToast(`${currentType === 'income' ? 'Income' : 'Expense'} added!`, 'success');
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.remove('hidden');
  }
});

// ===================== EDIT MODAL =====================
const openEditModal = (e) => {
  const id   = e.currentTarget.getAttribute('data-id');
  const type = e.currentTarget.getAttribute('data-type');
  const tx   = transactions.find(t => t._id === id);
  if (!tx) return;

  document.getElementById('editId').value   = id;
  document.getElementById('editType').value = type;
  document.getElementById('editAmount').value = tx.amount;
  document.getElementById('editDate').value = new Date(tx.date).toISOString().split('T')[0];
  document.getElementById('editNote').value = tx.note || '';
  editError.classList.add('hidden');

  editModalBadge.className = `modal-type-badge ${type}`;
  editModalBadge.textContent = type === 'income' ? '💰 Income' : '💸 Expense';

  const editCat = document.getElementById('editCategory');
  populateCategories(editCat, type);
  editCat.value = tx.category;
  editModal.classList.remove('hidden');
};

const closeEditModal = () => editModal.classList.add('hidden');
editModalClose.addEventListener('click', closeEditModal);
editCancelBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  editError.classList.add('hidden');
  const id       = document.getElementById('editId').value;
  const type     = document.getElementById('editType').value;
  const amount   = document.getElementById('editAmount').value;
  const date     = document.getElementById('editDate').value;
  const category = document.getElementById('editCategory').value;
  const note     = document.getElementById('editNote').value;

  try {
    const res = await authFetch(`/${type}s/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ amount: Number(amount), date, category, note }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to update');
    }
    closeEditModal();
    await fetchTransactions();
    loadInsights();
    showToast('Transaction updated!', 'success');
  } catch (err) {
    editError.textContent = err.message;
    editError.classList.remove('hidden');
  }
});

// ===================== DELETE MODAL =====================
const openDeleteModal = (e) => {
  deleteTarget = { id: e.currentTarget.getAttribute('data-id'), type: e.currentTarget.getAttribute('data-type') };
  deleteModal.classList.remove('hidden');
};
const closeDeleteModal = () => { deleteModal.classList.add('hidden'); deleteTarget = null; };
deleteCancelBtn.addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

deleteConfirmBtn.addEventListener('click', async () => {
  if (!deleteTarget) return;
  const { id, type } = deleteTarget;
  closeDeleteModal();
  try {
    const res = await authFetch(`/${type}s/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    await fetchTransactions();
    loadInsights();
    showToast('Transaction deleted.', 'info');
  } catch {
    showToast('Failed to delete.', 'error');
  }
});

// ===================== SEARCH & FILTERS =====================
const debouncedSearch = debounce((val) => { activeFilters.search = val; renderTransactions(); }, 300);
searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
toggleFiltersBtn.addEventListener('click', () => advancedFilters.classList.toggle('hidden'));

document.querySelectorAll('[data-date]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('[data-date]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilters.datePreset = chip.getAttribute('data-date');
    renderTransactions();
  });
});

filterType.addEventListener('change',      () => { activeFilters.type      = filterType.value;      renderTransactions(); });
filterCategory.addEventListener('change',  () => { activeFilters.category  = filterCategory.value;  renderTransactions(); });
filterSort.addEventListener('change',      () => { activeFilters.sort      = filterSort.value;      renderTransactions(); });
filterStartDate.addEventListener('change', () => { activeFilters.startDate = filterStartDate.value; renderTransactions(); });
filterEndDate.addEventListener('change',   () => { activeFilters.endDate   = filterEndDate.value;   renderTransactions(); });

// ===================== LOGOUT =====================
const handleLogout = async () => { await signOut(auth); localStorage.removeItem('token'); window.location.href = '../index.html'; };
document.getElementById('logoutBtn').addEventListener('click', handleLogout);

// ===================== AUTH INIT =====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (userName) userName.textContent = user.displayName?.split(' ')[0] || 'User';
    setGreeting();
    const freshToken = await user.getIdToken();
    localStorage.setItem('token', freshToken);
    mainContainer.style.display = 'block';
    document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
    populateCategories(tCategory, 'expense');
    populateFilterCategories();
    showLoader(false);
    await fetchTransactions();
    loadInsights();
  } else {
    window.location.href = '../index.html';
  }
});
