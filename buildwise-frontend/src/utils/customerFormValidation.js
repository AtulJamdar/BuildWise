/**
 * Customer Form Validation
 * Validation rules for customer pricing forms
 */

/**
 * Validate pricing request form
 */
export const validatePricingRequestForm = (formData) => {
  const errors = {};

  if (!formData.companyName?.trim()) {
    errors.companyName = 'Company name is required';
  }

  if (!formData.teamSize || parseInt(formData.teamSize) < 1) {
    errors.teamSize = 'Team size must be at least 1 member';
  }

  if (!formData.scansPerMonth || parseInt(formData.scansPerMonth) < 1) {
    errors.scansPerMonth = 'Scans per month must be at least 1';
  }

  if (!formData.budgetMin || parseInt(formData.budgetMin) < 0) {
    errors.budgetMin = 'Minimum budget must be a positive number';
  }

  if (!formData.budgetMax || parseInt(formData.budgetMax) < 0) {
    errors.budgetMax = 'Maximum budget must be a positive number';
  }

  if (parseInt(formData.budgetMin) > parseInt(formData.budgetMax)) {
    errors.budgetMax = 'Maximum budget must be greater than minimum budget';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate payment form
 */
export const validatePaymentForm = (formData) => {
  const errors = {};

  if (!formData.cardName?.trim()) {
    errors.cardName = 'Cardholder name is required';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Check if field has error
 */
export const hasFieldError = (errors, fieldName) => {
  return !!errors?.[fieldName];
};

/**
 * Get field error message
 */
export const getFieldErrorMessage = (errors, fieldName) => {
  return errors?.[fieldName] || '';
};
