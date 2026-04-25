/**
 * Custom Plan Details & Payment Page
 * Shows approved plan and handles payment
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { usePricingRequests } from '../hooks/usePricingRequests';
import { formatCurrency, formatDate, formatFeatures, daysRemaining } from '../utils/customerUtils';
import { parseError } from '../utils/errorHandler';

// Mock Razorpay integration (would be actual in production)
const initializeRazorpay = (options) => {
  if (!window.Razorpay) {
    console.error('Razorpay not loaded');
    return false;
  }
  return new window.Razorpay(options);
};

export const CustomPlanDetails = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { fetchRequestById } = usePricingRequests();

  const [request, setRequest] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  /**
   * Load request details on mount
   */
  useEffect(() => {
    const loadRequest = async () => {
      try {
        setLoading(true);
        const data = await fetchRequestById(requestId);
        if (data) {
          const requestData = data.request || data;
          setRequest(requestData);

          // Extract plan info from request
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

    loadRequest();
  }, [requestId, fetchRequestById]);

  /**
   * Handle payment initiation
   */
  const handlePayment = async () => {
    if (!plan) return;

    setPaymentLoading(true);
    try {
      // This would call your Razorpay order creation endpoint
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: plan.custom_price * 100, // Razorpay expects amount in paise
        currency: 'INR',
        name: 'BuildWise',
        description: `Custom Pricing Plan - ${request.company_name}`,
        order_id: plan.razorpay_order_id,
        handler: (response) => {
          // Success callback
          console.log('Payment successful:', response);
          setShowPaymentModal(false);
          navigate(`/pricing/payment-confirmation/${requestId}`);
        },
        prefill: {
          name: request.company_name,
          email: request.email || '',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const razorpay = initializeRazorpay(options);
      razorpay.open();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <p className="text-gray-600">⏳ Loading plan details...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <p className="text-red-600 font-semibold mb-4">Request not found</p>
            <Button
              variant="primary"
              onClick={() => navigate('/pricing/requests')}
            >
              Back to Requests
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const daysLeft = plan ? daysRemaining(plan.expires_at) : 0;
  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isPaid = request.status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">{request.company_name}</h1>
            <p className="text-gray-600 mt-2">Request #{request.id}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/pricing/requests')}
          >
            ← Back
          </Button>
        </div>

        {/* Error Alert */}
        {error && <Alert type="error" message={error} />}

        {/* Status Info */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-800">
            {isPending && "⏳ Your request is under review. We'll send you an email with the proposed plan soon."}
            {isApproved && "✅ Your custom plan is ready! Review the details below and proceed with payment."}
            {isPaid && "💳 Payment received! Your plan is now active."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Details */}
          <div className="lg:col-span-2">
            {/* Original Request */}
            <Card title="📋 Original Request" className="mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Team Size</p>
                  <p className="text-lg font-bold text-gray-800">{request.team_size} members</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Scans/Month</p>
                  <p className="text-lg font-bold text-gray-800">{request.scans_per_month}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Budget Range</p>
                  <p className="text-lg font-bold text-gray-800">
                    {formatCurrency(request.budget_min)} - {formatCurrency(request.budget_max)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Submitted</p>
                  <p className="text-lg font-bold text-gray-800">{formatDate(request.created_at)}</p>
                </div>
              </div>

              {request.specific_features && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-600 font-semibold mb-2">Requested Features</p>
                  <p className="text-gray-800">{request.specific_features}</p>
                </div>
              )}
            </Card>

            {/* Custom Plan */}
            {plan && isApproved && (
              <Card title="✅ Custom Plan Proposed" className="mb-6 border-l-4 border-green-500">
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Custom Price</p>
                    <p className="text-4xl font-bold text-green-700 mt-2">
                      {formatCurrency(plan.custom_price)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Scans Per Month</p>
                      <p className="text-lg font-bold text-gray-800">{plan.scans_per_month}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Validity</p>
                      <p className="text-lg font-bold text-gray-800">{plan.validity_days} days</p>
                    </div>
                  </div>

                  {plan.features && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-2">Included Features</p>
                      <ul className="space-y-2">
                        {Array.isArray(plan.features) ? (
                          plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center text-gray-700">
                              <span className="text-green-600 mr-2">✓</span>
                              {feature}
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-700">{formatFeatures(plan.features)}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {plan.approval_notes && (
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Admin Notes</p>
                      <p className="text-sm text-gray-700">{plan.approval_notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Paid Plan */}
            {isPaid && plan && (
              <Card title="💳 Active Plan" className="mb-6 border-l-4 border-blue-500">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Plan Amount</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(plan.custom_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold text-right">Days Remaining</p>
                      <p className="text-2xl font-bold text-blue-700 text-right">{daysLeft} days</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Scans/Month</p>
                      <p className="text-lg font-bold text-gray-800">{plan.scans_per_month}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Expires</p>
                      <p className="text-lg font-bold text-gray-800">{formatDate(plan.expires_at)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Payment Card */}
            {isApproved && plan && (
              <Card title="💳 Payment" className="sticky top-8">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600 font-semibold">Total Amount</p>
                    <p className="text-3xl font-bold text-blue-700 mt-2">
                      {formatCurrency(plan.custom_price)}
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    size="md"
                    onClick={() => setShowPaymentModal(true)}
                    loading={paymentLoading}
                  >
                    💳 Proceed to Payment
                  </Button>

                  <p className="text-xs text-gray-600">
                    ✓ Secure payment via Razorpay
                    <br />
                    ✓ 256-bit SSL encryption
                    <br />
                    ✓ All major cards accepted
                  </p>
                </div>
              </Card>
            )}

            {/* Info Card */}
            <Card title="ℹ️ Need Help?" className="mt-6">
              <p className="text-sm text-gray-700 mb-3">
                Have questions about your plan?
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.location.href = 'mailto:support@buildwise.app'}
              >
                📧 Contact Support
              </Button>
            </Card>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && isApproved && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Confirm Payment</h3>

                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Amount to Pay</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {formatCurrency(plan.custom_price)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handlePayment}
                    loading={paymentLoading}
                  >
                    💳 Pay Now
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
