// Shared utility functions used across the app

const BACKEND_URL = 'https://trackify-backend-stf8.onrender.com';
const API_BASE = `${BACKEND_URL}/api`;
export { BACKEND_URL };
// Fetch wrapper that automatically injects the Firebase auth token
export const authFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '../index.html';
  }
  return res;
};

// Format number as Indian Rupees
export const formatCurrency = (amount) => {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Toast notification system
let toastContainer = null;

const getToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.getElementById('toastContainer');
  }
  return toastContainer;
};

export const showToast = (message, type = 'success') => {
  const container = getToastContainer();
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('toast-show'));

  // Auto-remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
};

// Show/hide the full-page spinner loader
export const showLoader = (show) => {
  const loader = document.getElementById('loader');
  if (!loader) return;
  if (show) loader.classList.remove('hidden');
  else loader.classList.add('hidden');
};

// Skeleton loader HTML helper
export const skeletonRow = () => `
  <li class="skeleton-item">
    <div class="skeleton-line w60"></div>
    <div class="skeleton-line w30"></div>
  </li>
`;

export const showSkeletons = (listEl, count = 5) => {
  listEl.innerHTML = Array(count).fill(skeletonRow()).join('');
};

// Debounce helper for search
export const debounce = (fn, delay = 350) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// Format date for display
export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};
