/**
 * Pricing Request Form Page
 * Allows customers to submit custom pricing requests
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/admin/Card';
import { Input } from '../components/admin/Input';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { usePricingRequestForm } from '../hooks/usePricingRequestForm';
import { validatePricingRequestForm } from '../utils/customerFormValidation';
import { parseError } from '../utils/errorHandler';

export const PricingRequestForm = () => {
  const navigate = useNavigate();
  const { formData, errors: submitErrors, loading, success, handleChange, reset, submit } = usePricingRequestForm();
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    setShowSuccess(false);

    // Validate
    const { isValid, errors } = validatePricingRequestForm(formData);
    if (!isValid) {
      setValidationErrors(errors);
      return;
    }

    try {
      await submit();
      setShowSuccess(true);

      // Redirect after delay
      setTimeout(() => {
        navigate('/pricing/requests');
      }, 2000);
    } catch (error) {
      setValidationErrors({ submit: parseError(error) });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800">Request Custom Pricing</h1>
          <p className="text-gray-600 mt-3">
            Tell us about your requirements and we'll create a tailored plan for you
          </p>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <Alert
            type="success"
            message="✓ Request submitted successfully! Redirecting to your requests..."
          />
        )}

        {/* Error Alert */}
        {validationErrors.submit && (
          <Alert
            type="error"
            message={validationErrors.submit}
            onClose={() => setValidationErrors({})}
          />
        )}

        {/* Form Card */}
        <Card className="shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Section */}
            <div className="pb-6 border-b">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Company Information</h3>

              <Input
                label="Company Name"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                error={validationErrors.companyName}
                placeholder="Your company name"
                required
              />
            </div>

            {/* Requirements Section */}
            <div className="pb-6 border-b">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Requirements</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Team Size"
                  name="teamSize"
                  type="number"
                  value={formData.teamSize}
                  onChange={handleChange}
                  error={validationErrors.teamSize}
                  placeholder="Number of team members"
                  min="1"
                  required
                />

                <Input
                  label="Scans Per Month"
                  name="scansPerMonth"
                  type="number"
                  value={formData.scansPerMonth}
                  onChange={handleChange}
                  error={validationErrors.scansPerMonth}
                  placeholder="Expected scans per month"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Budget Section */}
            <div className="pb-6 border-b">
              <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Budget Range</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Minimum Budget (₹)"
                  name="budgetMin"
                  type="number"
                  value={formData.budgetMin}
                  onChange={handleChange}
                  error={validationErrors.budgetMin}
                  placeholder="e.g., 50000"
                  min="0"
                  required
                />

                <Input
                  label="Maximum Budget (₹)"
                  name="budgetMax"
                  type="number"
                  value={formData.budgetMax}
                  onChange={handleChange}
                  error={validationErrors.budgetMax}
                  placeholder="e.g., 100000"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Features Section */}
            <div className="pb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">✨ Specific Features (Optional)</h3>

              <textarea
                name="specificFeatures"
                value={formData.specificFeatures}
                onChange={handleChange}
                placeholder="Describe any specific features or integrations you need..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="5"
              />
              <p className="text-xs text-gray-600 mt-2">
                e.g., Integration with GitHub, Advanced reporting, API access, etc.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={loading}
                className="flex-1"
              >
                {loading ? '📤 Submitting...' : '📤 Submit Request'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={reset}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">ℹ️ What happens next?</span>
              <br />
              Our team will review your request within 24-48 hours and send you a custom pricing proposal via email.
            </p>
          </div>
        </Card>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">❓ Frequently Asked Questions</h2>

          <div className="space-y-4">
            <Card>
              <h3 className="font-bold text-gray-800 mb-2">How long does it take to get a quote?</h3>
              <p className="text-gray-600 text-sm">
                We typically review requests within 24-48 hours and send you a custom proposal via email.
              </p>
            </Card>

            <Card>
              <h3 className="font-bold text-gray-800 mb-2">Can I modify my request after submitting?</h3>
              <p className="text-gray-600 text-sm">
                Yes! You can update your request anytime before our team starts the review process.
              </p>
            </Card>

            <Card>
              <h3 className="font-bold text-gray-800 mb-2">What if the proposed price doesn't fit my budget?</h3>
              <p className="text-gray-600 text-sm">
                Our team will work with you to find a solution that fits your needs and budget constraints.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
