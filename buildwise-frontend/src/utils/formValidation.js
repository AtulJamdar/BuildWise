/**
 * Form Validation Utilities
 * Validation functions for admin forms
 */

/**
 * Validate login form
 */
export const validateLoginForm = (email, password) => {
  const errors = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!email.includes('@')) {
    errors.email = 'Please enter a valid email';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate approval form
 */
export const validateApprovalForm = (formData) => {
  const errors = {};

  if (!formData.customPrice || formData.customPrice <= 0) {
    errors.customPrice = 'Custom price must be greater than 0';
  }

  if (!formData.scansPerMonth || formData.scansPerMonth <= 0) {
    errors.scansPerMonth = 'Scans per month must be greater than 0';
  }

  if (!formData.validityDays || formData.validityDays <= 0) {
    errors.validityDays = 'Validity days must be greater than 0';
  }

  if (!formData.features || formData.features.length === 0) {
    errors.features = 'Please select at least one feature';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate rejection form
 */
export const validateRejectionForm = (reason) => {
  const errors = {};

  if (!reason || reason.trim().length === 0) {
    errors.reason = 'Please provide a rejection reason';
  }

  if (reason && reason.length < 10) {
    errors.reason = 'Reason must be at least 10 characters';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Get error message for field
 */
export const getFieldError = (errors, fieldName) => {
  return errors?.[fieldName] || '';
};

/**
 * Check if field has error
 */
export const hasFieldError = (errors, fieldName) => {
  return !!errors?.[fieldName];
};
