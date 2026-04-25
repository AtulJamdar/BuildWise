/**
 * useRenewal Hook
 * Manages plan renewal requests, pricing calculations, and payment processing
 */

import { useState, useCallback, useEffect } from 'react';
import * as customerApi from '../services/customerApi';

export const useRenewal = () => {
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [renewalOptions, setRenewalOptions] = useState([]);

  /**
   * Get available renewal options for a plan
   * Typical options: 30 days, 90 days, 1 year
   */
  const getRenewalOptions = useCallback((planPrice, planValidity) => {
    try {
      const options = [
        {
          days: 30,
          label: '30 Days',
          discount: 0
        },
        {
          days: 90,
          label: '3 Months',
          discount: 5
        },
        {
          days: 180,
          label: '6 Months',
          discount: 10
        },
        {
          days: 365,
          label: '1 Year',
          discount: 15
        }
      ];

      // Calculate price for each option
      const optionsWithPrice = options.map((option) => {
        const dailyRate = planPrice / planValidity;
        const basePrice = dailyRate * option.days;
        const discountAmount = (basePrice * option.discount) / 100;
        const finalPrice = basePrice - discountAmount;

        return {
          ...option,
          basePrice: parseFloat(basePrice.toFixed(2)),
          discount_amount: parseFloat(discountAmount.toFixed(2)),
          final_price: parseFloat(finalPrice.toFixed(2)),
          savings: option.discount > 0 ? `Save ₹${discountAmount.toFixed(2)} (${option.discount}%)` : null
        };
      });

      setRenewalOptions(optionsWithPrice);
      return optionsWithPrice;
    } catch (err) {
      const message = err.message || 'Failed to get renewal options';
      setError(message);
      return [];
    }
  }, []);

  /**
   * Fetch user's renewal requests
   */
  const fetchRenewals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.getUserRenewals();
      setRenewals(data);
      return data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Failed to fetch renewals';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a renewal request for a plan
   */
  const createRenewal = useCallback(async (planId, renewalDays) => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.createRenewalRequest(planId, renewalDays);
      
      // Add to renewals list
      setRenewals((prev) => [data, ...prev]);
      
      return data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Failed to create renewal request';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get renewal request details
   */
  const getRenewalDetails = useCallback(async (renewalId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.getRenewalRequestDetails(renewalId);
      return data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Failed to fetch renewal details';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check renewal payment status
   */
  const checkPaymentStatus = useCallback(async (renewalId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.checkRenewalPaymentStatus(renewalId);
      return data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Failed to check payment status';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel a renewal request (only for pending status)
   */
  const cancelRenewal = useCallback(async (renewalId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.cancelRenewalRequest(renewalId);
      
      // Update renewals list
      setRenewals((prev) =>
        prev.map((r) => (r.renewal_id === renewalId ? { ...r, status: 'cancelled' } : r))
      );
      
      return data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Failed to cancel renewal';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get renewal status badge color
   */
  const getStatusBadgeColor = useCallback((status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-blue-100 text-blue-800 border-blue-300',
      paid: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  }, []);

  /**
   * Format renewal period text
   */
  const formatRenewalPeriod = useCallback((days) => {
    if (days === 30) return '1 Month';
    if (days === 90) return '3 Months';
    if (days === 180) return '6 Months';
    if (days === 365) return '1 Year';
    return `${days} Days`;
  }, []);

  /**
   * Calculate days until plan expiry
   */
  const calculateDaysUntilExpiry = useCallback((expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  /**
   * Check if plan is eligible for renewal (expires within 30 days)
   */
  const isEligibleForRenewal = useCallback((expiryDate) => {
    const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }, [calculateDaysUntilExpiry]);

  /**
   * Check if plan has already expired
   */
  const isExpired = useCallback((expiryDate) => {
    return calculateDaysUntilExpiry(expiryDate) <= 0;
  }, [calculateDaysUntilExpiry]);

  return {
    renewals,
    loading,
    error,
    renewalOptions,
    fetchRenewals,
    createRenewal,
    getRenewalDetails,
    checkPaymentStatus,
    cancelRenewal,
    getRenewalOptions,
    getStatusBadgeColor,
    formatRenewalPeriod,
    calculateDaysUntilExpiry,
    isEligibleForRenewal,
    isExpired
  };
};

export default useRenewal;
