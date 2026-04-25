/**
 * Payment Confirmation Page
 * Shows successful payment confirmation and next steps
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { usePricingRequests } from '../hooks/usePricingRequests';
import { formatCurrency, formatDate } from '../utils/customerUtils';
import { parseError } from '../utils/errorHandler';

export const PaymentConfirmation = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { fetchRequestById } = usePricingRequests();

  const [request, setRequest] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Load request and plan on mount
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchRequestById(requestId);
        if (data) {
          const requestData = data.request || data;
          setRequest(requestData);
          if (requestData.plan) {
            setPlan(requestData.plan);
          }
        } else {
          setError('Request not found');
        }
      } catch (err) {
        setError(parseError(err));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [requestId, fetchRequestById]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="text-center py-12">
          <p className="text-gray-600">⏳ Processing...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse" />
              <div className="relative w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-5xl">✓</span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-800 mt-6">Payment Successful!</h1>
          <p className="text-gray-600 mt-3">
            Your custom pricing plan has been activated
          </p>
        </div>

        {/* Details Card */}
        {request && plan && (
          <Card className="mb-8">
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="pb-6 border-b">
                <h3 className="text-lg font-bold text-gray-800 mb-4">💳 Payment Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {formatCurrency(plan.custom_price)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Payment Date</p>
                    <p className="text-lg font-bold text-gray-800 mt-2">
                      {formatDate(new Date())}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Order ID</p>
                    <p className="text-sm font-mono text-gray-800 mt-2">
                      {plan.razorpay_order_id || '#N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Payment ID</p>
                    <p className="text-sm font-mono text-gray-800 mt-2">
                      {plan.razorpay_payment_id || '#N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              <div className="pb-6 border-b">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Your Plan</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Company</span>
                    <span className="font-bold text-gray-800">{request.company_name}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Scans Per Month</span>
                    <span className="font-bold text-gray-800">{plan.scans_per_month}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Validity</span>
                    <span className="font-bold text-gray-800">{plan.validity_days} days</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Expires On</span>
                    <span className="font-bold text-gray-800">{formatDate(plan.expires_at)}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              {plan.features && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">✨ Included Features</h3>

                  <ul className="space-y-2">
                    {Array.isArray(plan.features) ? (
                      plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center p-3 bg-green-50 rounded">
                          <span className="text-green-600 mr-3 text-lg">✓</span>
                          <span className="text-gray-800">{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-center p-3 bg-green-50 rounded">
                        <span className="text-green-600 mr-3 text-lg">✓</span>
                        <span className="text-gray-800">{plan.features}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Next Steps */}
        <Card title="📋 What's Next?" className="mb-8">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-bold text-gray-800">Access Your Dashboard</p>
                <p className="text-sm text-gray-600 mt-1">
                  Go to your dashboard to start using the new plan immediately
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-bold text-gray-800">Invite Your Team</p>
                <p className="text-sm text-gray-600 mt-1">
                  Add team members to collaborate on projects
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-bold text-gray-800">Create Your First Project</p>
                <p className="text-sm text-gray-600 mt-1">
                  Set up projects and start scanning code
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => navigate('/dashboard')}
          >
            🎯 Go to Dashboard
          </Button>

          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate('/pricing/requests')}
          >
            📋 View All Plans
          </Button>
        </div>

        {/* Support Card */}
        <Card className="mt-8 text-center">
          <p className="text-sm text-gray-700 mb-3">
            Need help? Our support team is here to assist you
          </p>
          <a
            href="mailto:support@buildwise.app"
            className="inline-block px-6 py-2 text-blue-600 font-semibold hover:underline"
          >
            📧 support@buildwise.app
          </a>
        </Card>

        {/* Receipt */}
        <Card className="mt-8" title="📄 Receipt">
          <p className="text-xs text-gray-600 mb-4">
            A detailed receipt has been sent to your email address. You can download it below or access it anytime from your account settings.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.print()}
          >
            🖨️ Download Receipt
          </Button>
        </Card>
      </div>
    </div>
  );
};
