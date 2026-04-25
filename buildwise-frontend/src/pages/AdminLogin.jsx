/**
 * Admin Login Page
 * Handles admin authentication
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { Input } from '../components/admin/Input';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { validateLoginForm } from '../utils/formValidation';
import { parseError } from '../utils/errorHandler';
import { adminLogin } from '../services/adminApi';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Handle form input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessMessage('');

    // Validate form
    const { isValid, errors: validationErrors } = validateLoginForm(
      formData.email,
      formData.password
    );

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      // Call API
      const response = await adminLogin(formData.email, formData.password);

      // Check response
      if (response.token && response.admin) {
        // Save to context
        login(response.admin, response.token);
        setSuccessMessage('Login successful! Redirecting...');

        // Redirect after brief delay
        setTimeout(() => {
          navigate('/admin/dashboard', { replace: true });
        }, 500);
      } else {
        setApiError('Unexpected response format');
      }
    } catch (error) {
      setApiError(parseError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">BuildWise Admin</h1>
            <p className="text-gray-600 mt-2">Custom Pricing Management</p>
          </div>

          {/* Alerts */}
          {apiError && (
            <Alert
              type="error"
              message={apiError}
              onClose={() => setApiError('')}
            />
          )}

          {successMessage && (
            <Alert
              type="success"
              message={successMessage}
            />
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <Input
              label="Admin Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="admin@buildwise.app"
              required
              disabled={loading}
            />

            {/* Password */}
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Enter your password"
              required
              disabled={loading}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
            <p>
              Need access?{' '}
              <span className="text-blue-600 font-semibold">
                Contact support@buildwise.app
              </span>
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-white bg-opacity-20 backdrop-blur-md rounded-lg p-4 text-white text-center text-sm">
          <p>🔒 This is a secure admin panel for authorized personnel only.</p>
        </div>
      </div>
    </div>
  );
};
