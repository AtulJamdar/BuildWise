/**
 * useCustomPlans Hook
 * Manages custom pricing plans fetching and state
 */

import { useState, useCallback, useEffect } from 'react';
import { getMyCustomPlans, getCustomPlanById } from '../services/customerApi';

export const useCustomPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all custom plans for user
   */
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyCustomPlans();
      setPlans(response.plans || []);
    } catch (err) {
      setError(err.message);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch single plan by ID
   */
  const fetchPlanById = useCallback(async (planId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCustomPlanById(planId);
      return response.plan || response;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch on mount
   */
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    loading,
    error,
    fetchPlans,
    fetchPlanById,
  };
};
