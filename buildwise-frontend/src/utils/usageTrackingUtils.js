/**
 * Usage Tracking Utilities
 * Calculate and format usage metrics
 */

/**
 * Calculate usage percentage
 */
export const calculateUsagePercentage = (used, limit) => {
  if (!limit || limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
};

/**
 * Get usage status based on percentage
 */
export const getUsageStatus = (percentage) => {
  if (percentage >= 90) return 'critical';
  if (percentage >= 70) return 'warning';
  if (percentage >= 50) return 'moderate';
  return 'low';
};

/**
 * Get status color
 */
export const getUsageStatusColor = (status) => {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    moderate: 'bg-blue-100 text-blue-800 border-blue-300',
    low: 'bg-green-100 text-green-800 border-green-300',
  };
  return colors[status] || colors.low;
};

/**
 * Format usage numbers
 */
export const formatUsageNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

/**
 * Calculate days remaining
 */
export const calculateDaysRemaining = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Get expiry status
 */
export const getExpiryStatus = (daysRemaining) => {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'expiring-soon';
  if (daysRemaining <= 30) return 'approaching';
  return 'active';
};

/**
 * Get expiry status color
 */
export const getExpiryStatusColor = (status) => {
  const colors = {
    expired: 'bg-red-100 text-red-800',
    'expiring-soon': 'bg-red-50 text-red-700',
    approaching: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
  };
  return colors[status] || colors.active;
};

/**
 * Estimate days until limit reached
 */
export const estimateDaysUntilLimitReached = (used, limit, scansPerDay) => {
  if (scansPerDay === 0 || used >= limit) return 0;
  const remaining = limit - used;
  return Math.ceil(remaining / scansPerDay);
};

/**
 * Format chart data for usage trend
 */
export const formatChartData = (usageHistory) => {
  return usageHistory.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    }),
    scans: item.scans_count,
    timestamp: item.date,
  }));
};

/**
 * Calculate total usage across all plans
 */
export const calculateTotalUsage = (plans) => {
  return plans.reduce((total, plan) => total + (plan.usage?.total_scans || 0), 0);
};

/**
 * Calculate average daily usage
 */
export const calculateAverageDailyUsage = (totalScans, daysElapsed) => {
  if (daysElapsed === 0) return 0;
  return Math.round(totalScans / daysElapsed);
};

/**
 * Get usage trend (increasing/decreasing)
 */
export const getUsageTrend = (currentPeriod, previousPeriod) => {
  const change = currentPeriod - previousPeriod;
  if (change > 0) return 'increasing';
  if (change < 0) return 'decreasing';
  return 'stable';
};
