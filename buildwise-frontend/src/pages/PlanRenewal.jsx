/**
 * Plan Renewal Page
 * Allows customers to renew or upgrade their plans
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { Input } from '../components/admin/Input';
import { useRenewal } from '../hooks/useRenewal';
import { useCustomPlans } from '../hooks/useCustomPlans';
import * as customerApi from '../services/customerApi';
import { formatCurrency, formatDate } from '../utils/customerUtils';
import { calculateProRatedPrice, calculateDiscount, formatRenewalPeriod } from '../utils/renewalUtils';
import { parseError } from '../utils/errorHandler';
import RazorpayPaymentModal from '../components/RazorpayPaymentModal';

export const PlanRenewal = () => {
  const navigate = useNavigate();
  const { createRenewal, getRenewalOptions, loading: renewalLoading } = useRenewal();
  const { myPlans, fetchMyPlans } = useCustomPlans();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedRenewalDays, setSelectedRenewalDays] = useState(365);
  const [renewalOptions, setRenewalOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  // Load user's plans on mount
  useEffect(() => {
    fetchMyPlans();
  }, [fetchMyPlans]);

  // Filter expiring plans (within 30 days)
  const renewablePlans = myPlans.filter(plan => {
    const expiryDate = new Date(plan.expires_at);
    const today = new Date();
    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 30 && daysRemaining > 0;
  });

  /**
   * Handle plan selection - show renewal options
   */
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setSelectedRenewalDays(365); // Default to 1 year
    setError('');
    
    // Generate renewal options based on plan pricing
    const options = getRenewalOptions(plan.custom_price, plan.validity_days);
    setRenewalOptions(options);
  };

  /**
   * Get price details for selected renewal period
   */
  const getPriceDetails = () => {
    if (!selectedPlan || !selectedRenewalDays) return null;
    
    const option = renewalOptions.find(o => o.days === selectedRenewalDays);
    if (!option) {
      // Calculate if not in options
      const proRated = calculateProRatedPrice(
        selectedPlan.custom_price,
        selectedPlan.validity_days,
        selectedRenewalDays
      );
      const discount = calculateDiscount(selectedRenewalDays);
      const discountAmount = (proRated * discount) / 100;
      
      return {
        basePrice: proRated,
        discountPercent: discount,
        discountAmount,
        finalPrice: proRated - discountAmount
      };
    }
    
    return {
      basePrice: option.basePrice,
      discountPercent: option.discount,
      discountAmount: option.discount_amount,
      finalPrice: option.final_price
    };
  };

  /**
   * Handle renewal request submission
   */
  const handleRenewalSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedPlan) {
      setError('Please select a plan to renew');
      return;
    }

    if (!selectedRenewalDays || selectedRenewalDays < 30) {
      setError('Renewal period must be at least 30 days');
      return;
    }

    setLoading(true);
    try {
      // Create renewal request
      const renewal = await createRenewal(selectedPlan.id, selectedRenewalDays);
      
      // Set payment data and show payment modal
      setPaymentData({
        renewal_id: renewal.renewal_id,
        order_id: renewal.order_id,
        payment_link: renewal.payment_link,
        amount: renewal.pro_rated_price,
        plan_id: selectedPlan.id,
        renewal_days: selectedRenewalDays
      });
      
      setShowPaymentModal(true);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful payment
   */
  const handlePaymentSuccess = async (paymentDetails) => {
    try {
      // Confirm renewal payment
      await customerApi.confirmRenewalPayment(
        paymentData.renewal_id,
        { razorpay_payment_id: paymentDetails.razorpay_payment_id }
      );

      setShowPaymentModal(false);
      setSuccessMessage('✅ Renewal payment successful! Your plan has been extended.');
      
      // Redirect after delay
      setTimeout(() => {
        navigate('/pricing/my-requests', { state: { tab: 'active' } });
      }, 2000);
    } catch (err) {
      setError('Payment confirmation failed: ' + parseError(err));
    }
  };

  const priceDetails = getPriceDetails();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800">🔄 Renew Your Plan</h1>
          <p className="text-gray-600 mt-3">
            Keep your BuildWise plan active and maintain uninterrupted access
          </p>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {successMessage && <Alert type="success" message={successMessage} />}

        {/* Payment Modal */}
        {showPaymentModal && paymentData && (
          <RazorpayPaymentModal
            amount={paymentData.amount}
            orderId={paymentData.order_id}
            paymentLink={paymentData.payment_link}
            planName={selectedPlan?.company_name}
            renewalDays={selectedRenewalDays}
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowPaymentModal(false)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Plans */}
          <div className="lg:col-span-2">
            <Card title="📋 Select Plan to Renew" subtitle="Choose from your expiring plans">
              {renewablePlans.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-6xl mb-3">✓</p>
                  <p className="text-gray-600 font-semibold text-lg">
                    No plans available for renewal
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Your active plans are not expiring soon. Good to go!
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-6"
                    onClick={() => navigate('/pricing/my-requests')}
                  >
                    View All Plans
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {renewablePlans.map((plan) => {
                    const expiryDate = new Date(plan.expires_at);
                    const today = new Date();
                    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                    return (
                      <div
                        key={plan.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedPlan?.id === plan.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                checked={selectedPlan?.id === plan.id}
                                onChange={() => handleSelectPlan(plan)}
                                className="w-4 h-4"
                              />
                              <div>
                                <h4 className="font-bold text-gray-800">
                                  {plan.company_name}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {plan.scans_per_month?.toLocaleString()} scans/month
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                                daysRemaining <= 7
                                  ? 'bg-red-100 text-red-800'
                                  : daysRemaining <= 14
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {daysRemaining} days left
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Expires: {formatDate(plan.expires_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Renewal Options Sidebar */}
          {selectedPlan && (
            <div>
              <form onSubmit={handleRenewalSubmit} className="space-y-5">
                {/* Plan Summary */}
                <Card title="📊 Plan Details">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Plan:</span>
                      <span className="font-semibold text-gray-800">
                        {selectedPlan.company_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Scans:</span>
                      <span className="font-semibold text-gray-800">
                        {selectedPlan.scans_per_month?.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Price:</span>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(selectedPlan.custom_price)}
                      </span>
                    </div>
                    <hr className="my-3" />
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Expires:</span>
                      <span className="font-semibold text-red-600">
                        {formatDate(selectedPlan.expires_at)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Renewal Period Selection */}
                <Card title="⏰ Renewal Period">
                  <div className="space-y-2">
                    {renewalOptions.map((option) => (
                      <label
                        key={option.days}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          value={option.days}
                          checked={selectedRenewalDays === option.days}
                          onChange={(e) => setSelectedRenewalDays(parseInt(e.target.value))}
                          className="w-4 h-4"
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-semibold text-gray-800">
                            {option.label}
                          </p>
                          {option.savings && (
                            <p className="text-xs text-green-600 font-semibold">
                              {option.savings}
                            </p>
                          )}
                        </div>
                        <p className="font-bold text-gray-800">
                          {formatCurrency(option.final_price)}
                        </p>
                      </label>
                    ))}
                  </div>
                </Card>

                {/* Price Breakdown */}
                {priceDetails && (
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-500">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Base Price:</span>
                        <span className="text-gray-800">
                          {formatCurrency(priceDetails.basePrice)}
                        </span>
                      </div>
                      {priceDetails.discountPercent > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            Discount ({priceDetails.discountPercent}%):
                          </span>
                          <span className="text-green-600 font-semibold">
                            -{formatCurrency(priceDetails.discountAmount)}
                          </span>
                        </div>
                      )}
                      <hr className="my-2 border-blue-200" />
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">Total Amount:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatCurrency(priceDetails.finalPrice)}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading || renewalLoading}
                  disabled={loading || renewalLoading}
                  className="w-full"
                >
                  {loading ? '⏳ Processing...' : '💳 Proceed to Payment'}
                </Button>

                {/* Info */}
                <div className="text-xs text-gray-600 text-center p-3 bg-gray-50 rounded">
                  <p>✓ Secure payment via Razorpay</p>
                  <p>✓ Your plan remains active during renewal</p>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Info Box */}
        <Card className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl mb-2">✓</p>
              <p className="font-bold text-gray-800 mb-1">Seamless Renewal</p>
              <p className="text-sm text-gray-600">
                No interruption to your service. Renew before expiry to maintain access.
              </p>
            </div>

            <div className="text-center">
              <p className="text-2xl mb-2">💰</p>
              <p className="font-bold text-gray-800 mb-1">Pro-rated Pricing</p>
              <p className="text-sm text-gray-600">
                Pay only for the days you need. Flexible periods from 30 days to 1 year.
              </p>
            </div>

            <div className="text-center">
              <p className="text-2xl mb-2">📧</p>
              <p className="font-bold text-gray-800 mb-1">Email Reminders</p>
              <p className="text-sm text-gray-600">
                Get notified 7 days before expiry so you never miss a renewal deadline.
              </p>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <Card title="❓ Renewal FAQ" className="mt-8">
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-gray-800 mb-2">What happens if my plan expires?</h4>
              <p className="text-sm text-gray-700">
                Once your plan expires, you'll lose access to scanning features until you renew.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-800 mb-2">Can I renew multiple plans at once?</h4>
              <p className="text-sm text-gray-700">
                You can renew each plan individually from this page. Visit this page multiple times to renew all plans.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-800 mb-2">Do renewal dates reset?</h4>
              <p className="text-sm text-gray-700">
                Yes, the renewal period starts from today and extends by the number of days you select.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
