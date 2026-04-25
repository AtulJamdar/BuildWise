/**
 * Renewal Utilities
 * Helper functions for plan renewal and pricing calculations
 */

/**
 * Calculate pro-rated price for renewal
 * Formula: (original_price / original_days) * renewal_days
 */
export const calculateProRatedPrice = (originalPrice, originalDays, renewalDays) => {
  try {
    const dailyRate = originalPrice / originalDays;
    const proRatedPrice = dailyRate * renewalDays;
    return parseFloat(proRatedPrice.toFixed(2));
  } catch (error) {
    console.error('Error calculating pro-rated price:', error);
    return 0;
  }
};

/**
 * Calculate discount based on renewal period
 */
export const calculateDiscount = (renewalDays) => {
  if (renewalDays === 30) return 0;
  if (renewalDays === 90) return 5;
  if (renewalDays === 180) return 10;
  if (renewalDays === 365) return 15;
  return 0;
};

/**
 * Calculate final price after discount
 */
export const calculateFinalPrice = (basePrice, discountPercent) => {
  const discountAmount = (basePrice * discountPercent) / 100;
  const finalPrice = basePrice - discountAmount;
  return {
    basePrice: parseFloat(basePrice.toFixed(2)),
    discountPercent,
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    finalPrice: parseFloat(finalPrice.toFixed(2))
  };
};

/**
 * Format renewal period to readable text
 */
export const formatRenewalPeriod = (days) => {
  const periods = {
    30: '30 Days (1 Month)',
    90: '90 Days (3 Months)',
    180: '180 Days (6 Months)',
    365: '365 Days (1 Year)'
  };
  return periods[days] || `${days} Days`;
};

/**
 * Get renewal status label with description
 */
export const getRenewalStatusLabel = (status) => {
  const labels = {
    pending: {
      label: 'Pending',
      description: 'Awaiting payment',
      color: 'yellow'
    },
    approved: {
      label: 'Approved',
      description: 'Ready for payment',
      color: 'blue'
    },
    paid: {
      label: 'Paid',
      description: 'Plan renewed',
      color: 'green'
    },
    cancelled: {
      label: 'Cancelled',
      description: 'Renewal cancelled',
      color: 'red'
    }
  };
  return labels[status] || { label: status, description: '', color: 'gray' };
};

/**
 * Calculate days until plan expiry
 */
export const calculateDaysUntilExpiry = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get renewal urgency level based on days until expiry
 */
export const getRenewalUrgency = (expiryDate) => {
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
  
  if (daysUntilExpiry <= 0) {
    return { level: 'expired', message: 'Plan has expired', color: 'red' };
  }
  if (daysUntilExpiry <= 7) {
    return { level: 'critical', message: 'Expires in less than a week', color: 'red' };
  }
  if (daysUntilExpiry <= 14) {
    return { level: 'urgent', message: 'Expires in less than 2 weeks', color: 'orange' };
  }
  if (daysUntilExpiry <= 30) {
    return { level: 'warning', message: 'Expires in less than a month', color: 'yellow' };
  }
  
  return { level: 'active', message: `Expires in ${daysUntilExpiry} days`, color: 'green' };
};

/**
 * Format renewal date for display
 */
export const formatRenewalDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get suggested renewal period based on current usage
 */
export const suggestRenewalPeriod = (averageDailyScans, currentPlanScans) => {
  // If very high usage, suggest longer period
  if (averageDailyScans > currentPlanScans * 0.8) {
    return { period: 365, reason: 'High usage detected - recommend 1 year renewal' };
  }
  
  // If moderate usage, suggest medium period
  if (averageDailyScans > currentPlanScans * 0.5) {
    return { period: 180, reason: 'Moderate usage detected - recommend 6 months renewal' };
  }
  
  // If low usage, suggest shorter period
  return { period: 90, reason: 'Lower usage - recommend 3 months renewal' };
};

/**
 * Validate renewal request before submission
 */
export const validateRenewalRequest = (planId, renewalDays, price) => {
  const errors = [];
  
  if (!planId) errors.push('Plan ID is required');
  if (!renewalDays || renewalDays <= 0) errors.push('Renewal days must be greater than 0');
  if (!price || price <= 0) errors.push('Price must be greater than 0');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate renewal summary for confirmation
 */
export const generateRenewalSummary = (plan, renewalDays, pricingInfo) => {
  return {
    planId: plan.id,
    currentExpiry: formatRenewalDate(plan.expires_at),
    newExpiry: formatRenewalDate(new Date(new Date().getTime() + renewalDays * 24 * 60 * 60 * 1000)),
    renewalPeriod: formatRenewalPeriod(renewalDays),
    scansIncluded: plan.scans_per_month,
    features: plan.features,
    pricing: pricingInfo,
    urgency: getRenewalUrgency(plan.expires_at)
  };
};

/**
 * Calculate total savings compared to monthly billing
 */
export const calculateTotalSavings = (monthlyPrice, renewalDays, discountPercent) => {
  const months = renewalDays / 30;
  const totalIfMonthly = monthlyPrice * months;
  const basePrice = (monthlyPrice / 30) * renewalDays;
  const discountAmount = (basePrice * discountPercent) / 100;
  
  return {
    monthlyRate: monthlyPrice,
    totalIfMonthly: parseFloat(totalIfMonthly.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    savings: parseFloat((discountAmount).toFixed(2)),
    monthsEquivalent: months
  };
};
