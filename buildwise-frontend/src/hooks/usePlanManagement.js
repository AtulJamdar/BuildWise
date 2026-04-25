/**
 * Plan Management Service
 * Handles plan activation, usage tracking, expiry, and renewal
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Fetch plan usage details
 */
const fetchPlanUsage = async (planId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pricing-plans/${planId}/usage`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('user_token')}` }
    });
    if (!response.ok) throw new Error('Failed to fetch usage');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * usePlanAnalytics Hook
 * Manages plan analytics and usage data
 */
export const usePlanAnalytics = (planId) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlanUsage(planId);
      setUsage(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { usage, loading, error, refetch: fetch };
};

/**
 * Fetch all invoices for user
 */
const fetchUserInvoices = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('user_token')}` }
    });
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * useInvoices Hook
 * Manages invoice fetching
 */
export const useInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserInvoices();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err.message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { invoices, loading, error, refetch: fetch };
};

/**
 * Request plan renewal
 */
export const requestPlanRenewal = async (planId, renewalDays) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pricing-plans/${planId}/renewal-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('user_token')}`
      },
      body: JSON.stringify({ renewal_days: renewalDays })
    });
    if (!response.ok) throw new Error('Failed to request renewal');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Download invoice
 */
export const downloadInvoice = async (invoiceId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${invoiceId}/download`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('user_token')}` }
    });
    if (!response.ok) throw new Error('Failed to download invoice');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw error;
  }
};
