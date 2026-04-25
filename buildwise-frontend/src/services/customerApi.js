/**
 * Customer API Service
 * Handles all customer pricing workflow endpoints
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Get authorization headers with JWT token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('user_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * Parse API error response
 */
const handleError = (response) => {
  if (!response.ok) {
    return response.json().then(data => {
      throw new Error(data.message || data.detail || `HTTP ${response.status}`);
    });
  }
  return response.json();
};

/**
 * Submit new pricing request
 * POST /api/pricing-requests
 */
export const createPricingRequest = async (requestData) => {
  try {
    const response = await fetch(`${API_URL}/api/pricing-requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to submit pricing request');
  }
};

/**
 * Get user's pricing requests
 * GET /api/pricing-requests/my
 */
export const getMyPricingRequests = async () => {
  try {
    const response = await fetch(`${API_URL}/api/pricing-requests/my`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch pricing requests');
  }
};

/**
 * Get single pricing request by ID
 * GET /api/pricing-requests/{id}
 */
export const getPricingRequestById = async (requestId) => {
  try {
    const response = await fetch(`${API_URL}/api/pricing-requests/${requestId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch pricing request');
  }
};

/**
 * Get user's custom pricing plans
 * GET /api/pricing-plans/my
 */
export const getMyCustomPlans = async () => {
  try {
    const response = await fetch(`${API_URL}/api/pricing-plans/my`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch custom plans');
  }
};

/**
 * Get custom plan details
 * GET /api/pricing-plans/{id}
 */
export const getCustomPlanById = async (planId) => {
  try {
    const response = await fetch(`${API_URL}/api/pricing-plans/${planId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch custom plan');
  }
};

/**
 * Process payment (webhook callback from Razorpay)
 * POST /api/pricing-plans/{id}/payment-confirmation
 */
export const confirmPayment = async (planId, paymentData) => {
  try {
    const response = await fetch(`${API_URL}/api/pricing-plans/${planId}/payment-confirmation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to confirm payment');
  }
};

/**
 * Get payment status
 * GET /api/pricing-plans/{id}/payment-status
 */
export const getPaymentStatus = async (planId) => {
  try {
    const response = await fetch(`${API_URL}/api/pricing-plans/${planId}/payment-status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch payment status');
  }
};

/**
 * Create renewal request for a plan
 * POST /api/plans/{id}/renew
 */
export const createRenewalRequest = async (planId, renewalDays) => {
  try {
    const response = await fetch(`${API_URL}/api/plans/${planId}/renew`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ renewal_days: renewalDays }),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to create renewal request');
  }
};

/**
 * Get user's renewal requests
 * GET /api/renewals/my
 */
export const getUserRenewals = async () => {
  try {
    const response = await fetch(`${API_URL}/api/renewals/my`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch renewal requests');
  }
};

/**
 * Get renewal request details
 * GET /api/renewals/{id}
 */
export const getRenewalRequestDetails = async (renewalId) => {
  try {
    const response = await fetch(`${API_URL}/api/renewals/${renewalId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch renewal request');
  }
};

/**
 * Check renewal payment status
 * GET /api/renewals/{id}/payment-status
 */
export const checkRenewalPaymentStatus = async (renewalId) => {
  try {
    const response = await fetch(`${API_URL}/api/renewals/${renewalId}/payment-status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to check renewal payment status');
  }
};

/**
 * Cancel renewal request (before payment)
 * POST /api/renewals/{id}/cancel
 */
export const cancelRenewalRequest = async (renewalId) => {
  try {
    const response = await fetch(`${API_URL}/api/renewals/${renewalId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to cancel renewal request');
  }
};

/**
 * Confirm renewal payment (after Razorpay payment)
 * POST /api/renewals/{id}/confirm-payment
 */
export const confirmRenewalPayment = async (renewalId, paymentData) => {
  try {
    const response = await fetch(`${API_URL}/api/renewals/${renewalId}/confirm-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
    return handleError(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to confirm renewal payment');
  }
};
