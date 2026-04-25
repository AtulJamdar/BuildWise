/**
 * Admin API Service
 * Handles all API calls for admin functionality
 * 
 * This service encapsulates all admin-related API endpoints
 * and provides a clean interface for components to use.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Get authorization headers with JWT token
 * @returns {Object} Headers with Authorization
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

/**
 * Admin login
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise} Response with token and admin data
 */
export const adminLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();

    // Transform backend response to match frontend expectations
    return {
      token: data.access_token,
      admin: {
        id: data.admin_id,
        name: data.admin_name,
        role: data.role,
      },
    };
  } catch (error) {
    throw new Error(`Login error: ${error.message}`);
  }
};

/**
 * Get all pending pricing requests
 * @returns {Promise} Array of pricing requests
 */
export const getPricingRequests = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api/pricing-requests`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch requests');
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Fetch requests error: ${error.message}`);
  }
};

/**
 * Get a specific pricing request by ID
 * @param {number} requestId - ID of the request
 * @returns {Promise} Request details
 */
export const getPricingRequestById = async (requestId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api/pricing-requests/${requestId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch request');
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Fetch request error: ${error.message}`);
  }
};

/**
 * Approve a pricing request and create custom plan
 * @param {number} requestId - ID of the request
 * @param {Object} approvalData - Custom price, features, etc.
 * @returns {Promise} Response with plan ID
 */
export const approvePricingRequest = async (requestId, approvalData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api/pricing-requests/${requestId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(approvalData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Approval failed');
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Approval error: ${error.message}`);
  }
};

/**
 * Reject a pricing request
 * @param {number} requestId - ID of the request
 * @param {string} adminNotes - Rejection reason
 * @returns {Promise} Response
 */
export const rejectPricingRequest = async (requestId, adminNotes) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api/pricing-requests/${requestId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_notes: adminNotes }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Rejection failed');
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Rejection error: ${error.message}`);
  }
};

/**
 * Create Razorpay order and generate payment link
 * @param {number} planId - ID of the custom pricing plan
 * @returns {Promise} Response with payment link
 */
export const createRazorpayOrder = async (planId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api/pricing-plans/${planId}/create-razorpay-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Order creation failed');
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Order creation error: ${error.message}`);
  }
};

/**
 * Get pending payments
 * @returns {Promise} Array of pending payments
 */
export const getPendingPayments = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api/pending-payments`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payments');
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Fetch payments error: ${error.message}`);
  }
};

/**
 * Verify admin token is valid
 * @returns {Promise} True if valid
 */
export const verifyAdminToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api/pricing-requests`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
};

export default {
  adminLogin,
  getPricingRequests,
  getPricingRequestById,
  approvePricingRequest,
  rejectPricingRequest,
  createRazorpayOrder,
  getPendingPayments,
  verifyAdminToken,
};
