// Single source of truth for all categories with emoji icons and colors
// Used across Dashboard, Analytics, Transaction List, and Profile

export const EXPENSE_CATEGORIES = [
  { value: 'Food',          icon: '🍔', label: 'Food',          color: '#f97316', bg: 'rgba(249,115,22,0.15)'  },
  { value: 'Travel',        icon: '🚗', label: 'Travel',        color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  { value: 'Rent',          icon: '🏠', label: 'Rent',          color: '#92400e', bg: 'rgba(146,64,14,0.15)'   },
  { value: 'Shopping',      icon: '🛒', label: 'Shopping',      color: '#ec4899', bg: 'rgba(236,72,153,0.15)'  },
  { value: 'Entertainment', icon: '🎬', label: 'Entertainment', color: '#a855f7', bg: 'rgba(168,85,247,0.15)'  },
  { value: 'Medical',       icon: '💊', label: 'Medical',       color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  { value: 'Education',     icon: '📚', label: 'Education',     color: '#06b6d4', bg: 'rgba(6,182,212,0.15)'   },
  { value: 'Bills',         icon: '💡', label: 'Bills',         color: '#eab308', bg: 'rgba(234,179,8,0.15)'   },
  { value: 'Business',      icon: '💼', label: 'Business',      color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  { value: 'Others',        icon: '🔖', label: 'Others',        color: '#6366f1', bg: 'rgba(99,102,241,0.15)'  },
  // Legacy
  { value: 'Health',        icon: '💊', label: 'Health',        color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
];

export const INCOME_CATEGORIES = [
  { value: 'Salary',       icon: '💰', label: 'Salary',       color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
  { value: 'Freelancing',  icon: '💵', label: 'Freelancing',  color: '#22d3ee', bg: 'rgba(34,211,238,0.15)'  },
  { value: 'Investments',  icon: '📈', label: 'Investments',  color: '#a3e635', bg: 'rgba(163,230,53,0.15)'  },
  { value: 'Gift',         icon: '🎁', label: 'Gift',         color: '#f43f5e', bg: 'rgba(244,63,94,0.15)'   },
  { value: 'Refund',       icon: '💳', label: 'Refund',       color: '#fb923c', bg: 'rgba(251,146,60,0.15)'  },
  { value: 'Others',       icon: '🔖', label: 'Others',       color: '#6366f1', bg: 'rgba(99,102,241,0.15)'  },
  // Legacy
  { value: 'Freelance',   icon: '💵', label: 'Freelance',    color: '#22d3ee', bg: 'rgba(34,211,238,0.15)'  },
];

// All categories merged for lookup
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

// Return full category object { value, icon, label, color, bg }
export const getCategoryData = (value) => {
  return ALL_CATEGORIES.find(c => c.value === value) || {
    value, icon: '🔖', label: value, color: '#6366f1', bg: 'rgba(99,102,241,0.15)',
  };
};

// Quick icon lookup (backward compatible)
export const getCategoryIcon = (value, type = 'expense') => {
  return getCategoryData(value).icon;
};

// Quick color lookup
export const getCategoryColor = (value) => getCategoryData(value).color;
export const getCategoryBg    = (value) => getCategoryData(value).bg;

// Backward compatibility
export const LEGACY_ICON_MAP = { 'Health': '💊', 'Freelance': '💵' };

export const getIcon = (value) => getCategoryData(value).icon;
