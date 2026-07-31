import { auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { authFetch, formatCurrency, showToast } from './utils.js';
import { EXPENSE_CATEGORIES, getCategoryData } from './categories.js';

const Chart = window.Chart;

let barChart = null, pieChart = null, lineChart = null;

const CHART_COLORS = {
  income: 'rgba(16,185,129,0.8)', incomeB: 'rgba(16,185,129,1)',
  expense: 'rgba(239,68,68,0.8)', expenseB: 'rgba(239,68,68,1)',
  pie: ['#6366f1','#8b5cf6','#a78bfa','#c084fc','#e879f9','#f43f5e','#fb923c','#facc15','#4ade80','#22d3ee'],
};
const gridColor = 'rgba(255,255,255,0.07)', textColor = '#94a3b8', fontFamily = 'Inter, sans-serif';

const baseScale = {
  grid: { color: gridColor },
  ticks: { color: textColor, font: { family: fontFamily } },
};
const chartDefaults = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: textColor, font: { family: fontFamily, size: 12 }, padding: 16 } },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12,
      titleFont: { family: fontFamily, size: 13 }, bodyFont: { family: fontFamily, size: 12 },
      callbacks: { label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    },
  },
  scales: {
    x: { ...baseScale },
    y: { ...baseScale, ticks: { ...baseScale.ticks, callback: (v) => `₹${Number(v).toLocaleString('en-IN')}` }, beginAtZero: true },
  },
};

// ===================== BAR CHART =====================
const renderBarChart = (data) => {
  const ctx = document.getElementById('barChart')?.getContext('2d');
  if (!ctx) return;
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        { label: 'Income', data: data.income, backgroundColor: CHART_COLORS.income, borderColor: CHART_COLORS.incomeB, borderWidth: 1, borderRadius: 6 },
        { label: 'Expense', data: data.expense, backgroundColor: CHART_COLORS.expense, borderColor: CHART_COLORS.expenseB, borderWidth: 1, borderRadius: 6 },
      ],
    },
    options: { ...chartDefaults },
  });
};

// ===================== PIE CHART =====================
const renderPieChart = (data) => {
  const ctx = document.getElementById('pieChart')?.getContext('2d');
  if (!ctx) return;
  if (pieChart) pieChart.destroy();

  if (!data.length) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = textColor; ctx.font = `13px ${fontFamily}`; ctx.textAlign = 'center';
    ctx.fillText('No expenses this month', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => { const c = getCategoryData(d.category); return `${c.icon} ${c.label}`; }),
      datasets: [{
        data: data.map(d => d.total),
        backgroundColor: data.map(d => getCategoryData(d.category).color),
        borderColor: 'rgba(15,23,42,0.8)', borderWidth: 2, hoverOffset: 8,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: textColor, font: { family: fontFamily, size: 11 }, padding: 10 } },
        tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })} — ${ctx.label}` } },
      },
    },
  });
};

// ===================== LINE CHART =====================
const renderLineChart = (data) => {
  const ctx = document.getElementById('lineChart')?.getContext('2d');
  if (!ctx) return;
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Daily Spending', data: data.spending,
        borderColor: CHART_COLORS.expenseB, backgroundColor: 'rgba(239,68,68,0.12)',
        pointBackgroundColor: CHART_COLORS.expenseB, pointRadius: 4, tension: 0.4, fill: true,
      }],
    },
    options: { ...chartDefaults },
  });
};

// ===================== CHANGE BADGE =====================
const renderChangeBadge = (el, change) => {
  if (!el) return;
  if (change === 0) {
    el.textContent = 'Same as last month'; el.className = 'as-change neutral';
  } else if (change > 0) {
    el.textContent = `↑ ${change}% from last month`; el.className = 'as-change up';
  } else {
    el.textContent = `↓ ${Math.abs(change)}% from last month`; el.className = 'as-change down';
  }
};

// ===================== ANALYTICS SUMMARY CARDS SKELETONS =====================
const showSummarySkeletons = () => {
  document.getElementById('analyticsSummaryGrid').innerHTML = Array(4).fill(`
    <div class="as-skeleton">
      <div class="as-skel-icon"></div>
      <div class="as-skel-body">
        <div class="as-skel-line w30"></div>
        <div class="as-skel-line w50"></div>
      </div>
    </div>`).join('');
};

// ===================== LOAD ANALYTICS SUMMARY =====================
const loadSummary = async (month, year) => {
  showSummarySkeletons();
  try {
    const res  = await authFetch(`/analytics/summary?month=${month}&year=${year}`);
    const data = await res.json();
    if (!res.ok) throw new Error();

    // Restore original card HTML
    document.getElementById('analyticsSummaryGrid').innerHTML = `
      <div class="analytics-summary-card">
        <div class="as-icon">💰</div>
        <div class="as-body">
          <div class="as-label">Income This Month</div>
          <div class="as-amount income" id="asIncome">${formatCurrency(data.income.amount)}</div>
          <div class="as-change" id="asIncomeChange"></div>
        </div>
      </div>
      <div class="analytics-summary-card">
        <div class="as-icon">💸</div>
        <div class="as-body">
          <div class="as-label">Expenses This Month</div>
          <div class="as-amount expense" id="asExpense">${formatCurrency(data.expense.amount)}</div>
          <div class="as-change" id="asExpenseChange"></div>
        </div>
      </div>
      <div class="analytics-summary-card">
        <div class="as-icon">🎯</div>
        <div class="as-body">
          <div class="as-label">Net Savings</div>
          <div class="as-amount savings" id="asSavings">${formatCurrency(data.savings.amount)}</div>
          <div class="as-change" id="asSavingsChange"></div>
        </div>
      </div>
      <div class="analytics-summary-card">
        <div class="as-icon">🔥</div>
        <div class="as-body">
          <div class="as-label">Top Spending Category</div>
          <div class="as-amount" id="asTopCat" style="font-size:1.1rem;">${data.topCategory ? data.topCategory.name : '—'}</div>
          <div class="as-change neutral" id="asTopCatAmt">${data.topCategory ? formatCurrency(data.topCategory.amount) : 'No expenses this month'}</div>
        </div>
      </div>`;

    renderChangeBadge(document.getElementById('asIncomeChange'),  data.income.change);
    renderChangeBadge(document.getElementById('asExpenseChange'), data.expense.change);
    renderChangeBadge(document.getElementById('asSavingsChange'), data.savings.change);

    // Color savings card dynamically
    const savEl = document.getElementById('asSavings');
    if (savEl) savEl.style.color = data.savings.amount < 0 ? 'var(--danger)' : 'var(--warning)';

  } catch (err) {
    console.error('Summary load error:', err);
  }
};

// ===================== LOAD ALL ANALYTICS =====================
const loadAnalytics = async () => {
  const month = parseInt(document.getElementById('analyticsMonth')?.value) || (new Date().getMonth() + 1);
  const year  = parseInt(document.getElementById('analyticsYear')?.value)  || new Date().getFullYear();

  await loadSummary(month, year);

  try {
    const [monthlyRes, catRes, dailyRes] = await Promise.all([
      authFetch(`/analytics/monthly?year=${year}`),
      authFetch(`/analytics/categories?month=${month}&year=${year}`),
      authFetch(`/analytics/daily?month=${month}&year=${year}`),
    ]);
    const [monthly, categories, daily] = await Promise.all([
      monthlyRes.json(), catRes.json(), dailyRes.json(),
    ]);

    // Check if there's any data at all
    const hasData = (monthly.income?.some(v => v > 0) || monthly.expense?.some(v => v > 0));
    const emptyEl = document.getElementById('analyticsEmptyState');
    const chartsEl = document.getElementById('chartsContainer');

    if (!hasData) {
      emptyEl?.classList.remove('hidden');
      chartsEl && (chartsEl.style.display = 'none');
      return;
    }

    emptyEl?.classList.add('hidden');
    chartsEl && (chartsEl.style.display = '');

    if (monthlyRes.ok) renderBarChart(monthly);
    if (catRes.ok) renderPieChart(Array.isArray(categories) ? categories : []);
    if (dailyRes.ok) renderLineChart(daily);
  } catch (err) {
    console.error('Analytics error:', err);
    showToast('Failed to load analytics', 'error');
  }
};

// ===================== YEAR SELECTOR =====================
const populateYearSelector = () => {
  const select = document.getElementById('analyticsYear');
  if (!select) return;
  const current = new Date().getFullYear();
  select.innerHTML = '';
  for (let y = current; y >= current - 4; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    select.appendChild(opt);
  }
};

const setDefaultSelectors = () => {
  const monthEl = document.getElementById('analyticsMonth');
  if (monthEl) monthEl.value = new Date().getMonth() + 1;
};

// ===================== INIT =====================
window.addEventListener('analyticsTabOpen', loadAnalytics);
document.getElementById('loadAnalyticsBtn')?.addEventListener('click', loadAnalytics);

onAuthStateChanged(auth, (user) => {
  if (user) { populateYearSelector(); setDefaultSelectors(); }
});
