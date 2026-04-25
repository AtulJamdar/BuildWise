/**
 * Customer Utilities
 * Common utility functions for customer portal
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
  });
};

/**
 * Format date with time
 */
export const formatDateTime = (dateString) => {
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
 * Calculate days remaining
 */
export const daysRemaining = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Check if plan is expiring soon (within 7 days)
 */
export const isExpiringsoon = (expiryDate) => {
  return daysRemaining(expiryDate) <= 7;
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    paid: 'bg-blue-100 text-blue-800',
  };
  return colors[status] || colors.pending;
};

/**
 * Get status display label
 */
export const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending Review',
    approved: 'Approved - Ready to Pay',
    rejected: 'Rejected',
    paid: 'Active',
  };
  return labels[status] || status;
};

/**
 * Get payment status color
 */
export const getPaymentStatusColor = (status) => {
  const colors = {
    pending: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
  };
  return colors[status] || colors.pending;
};

/**
 * Truncate text
 */
export const truncateText = (text, length = 100) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

/**
 * Format features array to readable string
 */
export const formatFeatures = (features) => {
  if (!features) return 'No features listed';
  if (Array.isArray(features)) {
    return features.join(', ');
  }
  return features;
};
