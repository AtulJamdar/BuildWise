/**
 * usePricingRequestForm Hook
 * Manages pricing request form state and submission
 */

import { useState, useCallback } from 'react';
import { createPricingRequest } from '../services/customerApi';

const initialFormState = {
  companyName: '',
  teamSize: '',
  scansPerMonth: '',
  specificFeatures: '',
  budgetMin: '',
  budgetMax: '',
};

export const usePricingRequestForm = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /**
   * Handle field change
   */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  /**
   * Reset form
   */
  const reset = useCallback(() => {
    setFormData(initialFormState);
    setErrors({});
    setSuccess(false);
  }, []);

  /**
   * Submit form
   */
  const submit = useCallback(async () => {
    setLoading(true);
    setErrors({});
    setSuccess(false);

    try {
      const response = await createPricingRequest({
        company_name: formData.companyName,
        team_size: parseInt(formData.teamSize),
        scans_per_month: parseInt(formData.scansPerMonth),
        specific_features: formData.specificFeatures,
        budget_min: parseInt(formData.budgetMin),
        budget_max: parseInt(formData.budgetMax),
      });

      setSuccess(true);
      reset();
      return response;
    } catch (error) {
      setErrors({ submit: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [formData, reset]);

  return {
    formData,
    errors,
    loading,
    success,
    handleChange,
    reset,
    submit,
  };
};
