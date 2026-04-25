/**
 * Admin Utilities
 * Common utility functions for admin panel
 */

/**
 * Format currency as Indian Rupees
 */
export const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date only (no time)
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate positive number within range
 */
export const validateNumber = (value, min = 0, max = Infinity) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

/**
 * Get badge color for status
 */
export const getStatusBadgeClass = (status) => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    paid: 'bg-blue-100 text-blue-800 border-blue-300',
  };
  return classes[status] || classes.pending;
};

/**
 * Get status display label
 */
export const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Payment Completed',
  };
  return labels[status] || status;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

/**
 * Calculate days remaining until date
 */
export const daysUntil = (dateString) => {
  const target = new Date(dateString);
  const today = new Date();
  const diff = target - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
};

/**
 * Format large numbers with K, M, B suffix
 */
export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};
