/**
 * usePayments Hook
 * Handles payments fetching and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { getPendingPayments, createRazorpayOrder } from '../services/adminApi';

export const usePayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch pending payments
   */
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPendingPayments();
      setPayments(response.plans || []);
    } catch (err) {
      setError(err.message);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create Razorpay order for a plan
   */
  const createOrder = useCallback(async (planId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createRazorpayOrder(planId);
      // Refresh payments list
      await fetchPayments();
      return response;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchPayments]);

  /**
   * Fetch on mount
   */
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    loading,
    error,
    fetchPayments,
    createOrder,
  };
};
