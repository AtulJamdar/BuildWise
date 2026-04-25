/**
 * Error Handler Utilities
 * Parse and handle API errors
 */

/**
 * Parse API error response
 */
export const parseError = (error) => {
  // If error has response (from axios/fetch)
  if (error.response) {
    const { status, data } = error.response;

    // Try to get error message from response
    if (data?.message) {
      return data.message;
    }
    if (data?.detail) {
      return data.detail;
    }
    if (data?.error) {
      return data.error;
    }

    // Fallback to status message
    const statusMessages = {
      400: 'Invalid request. Please check your input.',
      401: 'Authentication failed. Please login again.',
      403: 'You do not have permission to perform this action.',
      404: 'Resource not found.',
      500: 'Server error. Please try again later.',
      502: 'Service unavailable. Please try again later.',
      503: 'Service is temporarily down. Please try again later.',
    };

    return statusMessages[status] || `Error: ${status}`;
  }

  // If error is from request failure (no response)
  if (error.message === 'Network Error') {
    return 'Network error. Please check your internet connection.';
  }

  // Return error message if available
  if (error.message) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (errorString) => {
  const errorMap = {
    'already exists': 'This item already exists.',
    'not found': 'The requested item was not found.',
    'unauthorized': 'You are not authorized to perform this action.',
    'network': 'Network connection failed.',
    'timeout': 'Request timed out. Please try again.',
    'duplicate': 'This entry already exists.',
  };

  for (const [key, message] of Object.entries(errorMap)) {
    if (errorString.toLowerCase().includes(key)) {
      return message;
    }
  }

  return errorString;
};

/**
 * Handle retry logic
 */
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  delayMs = 1000
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, delayMs * Math.pow(2, attempt))
      );
    }
  }
};

/**
 * Create error object for form display
 */
export const createFormError = (fieldName, message) => {
  return {
    [fieldName]: message,
  };
};

/**
 * Clear specific error
 */
export const clearFieldError = (errors, fieldName) => {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
};

/**
 * Clear all errors
 */
export const clearAllErrors = () => {
  return {};
};
