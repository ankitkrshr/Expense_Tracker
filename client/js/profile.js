import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { authFetch, formatCurrency, showToast } from './utils.js';

// ===================== PROFILE LOAD =====================
const loadProfile = async (user) => {
  try {
    const res = await authFetch('/users/profile');
    if (!res.ok) throw new Error('Failed to fetch profile');
    const data = await res.json();

    // Avatar
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) {
      if (data.photoURL || user?.photoURL) {
        avatarEl.outerHTML = `<img class="profile-avatar" id="profileAvatar" src="${data.photoURL || user.photoURL}" alt="Avatar">`;
      } else {
        avatarEl.textContent = (data.name || 'U')[0].toUpperCase();
      }
    }

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('profileName', data.name || user?.displayName || 'User');
    setEl('profileEmail', data.email || user?.email || '');
    setEl('profileJoined', data.createdAt
      ? `Member since ${new Date(data.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
      : '');

    // Stats
    setEl('pTotalIncome', formatCurrency(data.totalIncome));
    setEl('pTotalExpense', formatCurrency(data.totalExpense));
    setEl('pBalance', formatCurrency(data.balance));
    setEl('pTxCount', data.totalTransactions);
    setEl('pMonthlySavings', formatCurrency(data.monthlySavings));

    // Color balance
    const balEl = document.getElementById('pBalance');
    if (balEl) balEl.style.color = data.balance < 0 ? 'var(--danger)' : 'var(--success)';

    // Color monthly savings
    const savEl = document.getElementById('pMonthlySavings');
    if (savEl) savEl.style.color = data.monthlySavings < 0 ? 'var(--danger)' : 'var(--warning)';
  } catch (err) {
    console.error('Profile load error:', err);
    showToast('Failed to load profile data', 'error');
  }
};

// ===================== EXPORT CSV =====================
const handleExport = async (type) => {
  const startDate = document.getElementById('exportStartDate')?.value || '';
  const endDate   = document.getElementById('exportEndDate')?.value   || '';

  const params = new URLSearchParams({ type });
  if (startDate) params.set('startDate', startDate);
  if (endDate)   params.set('endDate', endDate);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/export/csv?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `trackify_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('CSV exported successfully!', 'success');
  } catch (err) {
    showToast('Export failed. Please try again.', 'error');
  }
};

// ===================== LOGOUT (Profile Page) =====================
document.getElementById('logoutBtnProfile')?.addEventListener('click', async () => {
  await signOut(auth);
  localStorage.removeItem('token');
  window.location.href = '../index.html';
});

// ===================== EXPORT BUTTONS =====================
document.querySelectorAll('.export-btn').forEach(btn => {
  btn.addEventListener('click', () => handleExport(btn.getAttribute('data-type')));
});

// ===================== INIT =====================
window.addEventListener('profileTabOpen', async () => {
  const user = auth.currentUser;
  if (user) await loadProfile(user);
});

onAuthStateChanged(auth, async (user) => {
  // Pre-load profile data in background
  if (user) {
    // Lazy load — only when profile tab opens
  }
});
