/**
 * usePricingRequests Hook
 * Handles pricing requests fetching and state management
 */

import { useState, useCallback, useEffect } from 'react';
import { getPricingRequests, getPricingRequestById } from '../services/adminApi';

export const usePricingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');

  /**
   * Fetch all pricing requests
   */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPricingRequests();
      const allRequests = response.requests || [];
      
      // Filter by status
      const filtered = filter === 'all' 
        ? allRequests 
        : allRequests.filter(req => req.status === filter);
      
      setRequests(filtered);
    } catch (err) {
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  /**
   * Fetch single request by ID
   */
  const fetchRequestById = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPricingRequestById(requestId);
      return response;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh requests on mount or filter change
   */
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    filter,
    setFilter,
    fetchRequests,
    fetchRequestById,
  };
};
