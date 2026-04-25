/**
 * Razorpay Payment Modal
 * Handles Razorpay payment initiation and success callback
 * Integrates with Razorpay payment gateway for custom pricing & renewals
 */

import React, { useState, useEffect } from 'react';
import { Button } from './admin/Button';
import { Alert } from './admin/Alert';

const RazorpayPaymentModal = ({
  amount,
  orderId,
  paymentLink,
  planName,
  renewalDays,
  onSuccess,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'link'

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  /**
   * Open Razorpay payment gateway
   */
  const handleRazorpayPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.Razorpay) {
        throw new Error('Razorpay script not loaded');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        order_id: orderId,
        name: 'BuildWise',
        description: `${planName} - ${renewalDays} days renewal`,
        image: '/buildwise-logo.png',
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        handler: (response) => {
          // Payment successful
          onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        prefill: {
          email: localStorage.getItem('user_email') || '',
          contact: localStorage.getItem('user_phone') || ''
        },
        notes: {
          plan_name: planName,
          renewal_days: renewalDays
        },
        theme: {
          color: '#3498db'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      const message = err.message || 'Failed to open Razorpay payment gateway';
      setError(message);
      console.error('Razorpay error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open payment link (alternative method)
   */
  const handlePaymentLink = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank', 'width=600,height=800');
      
      // After opening link, poll for payment status
      const checkInterval = setInterval(() => {
        // This would be checked via API in real implementation
        // For now, user will confirm manually
      }, 2000);

      // Clear interval after 5 minutes
      setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">💳 Complete Payment</h2>
          <p className="text-gray-600 text-sm mt-2">Secure payment powered by Razorpay</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Plan:</span>
            <span className="font-semibold text-gray-800">{planName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Period:</span>
            <span className="font-semibold text-gray-800">
              {renewalDays} days
            </span>
          </div>
          <hr className="my-3" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-800">Total Amount:</span>
            <span className="text-xl font-bold text-blue-600">₹{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Payment Method:</p>
          
          <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50"
                 style={{borderColor: paymentMethod === 'razorpay' ? '#3498db' : '#e0e0e0'}}>
            <input
              type="radio"
              value="razorpay"
              checked={paymentMethod === 'razorpay'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-4 h-4"
            />
            <span className="ml-3">
              <p className="font-semibold text-gray-800">Razorpay Checkout</p>
              <p className="text-xs text-gray-600">Cards, UPI, Netbanking, Wallets</p>
            </span>
          </label>

          <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50"
                 style={{borderColor: paymentMethod === 'link' ? '#3498db' : '#e0e0e0'}}>
            <input
              type="radio"
              value="link"
              checked={paymentMethod === 'link'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-4 h-4"
            />
            <span className="ml-3">
              <p className="font-semibold text-gray-800">Payment Link</p>
              <p className="text-xs text-gray-600">Opens in new window</p>
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading}
            onClick={paymentMethod === 'razorpay' ? handleRazorpayPayment : handlePaymentLink}
            className="w-full"
          >
            {loading ? '⏳ Processing...' : '💳 Pay Now'}
          </Button>

          <Button
            variant="secondary"
            size="md"
            disabled={loading}
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        {/* Security Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            🔒 Secure payment gateway | No card details stored
          </p>
        </div>

        {/* Manual Payment Instructions */}
        {paymentMethod === 'link' && paymentLink && (
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-700 mb-2">
              <strong>If payment link doesn't open:</strong>
            </p>
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {paymentLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default RazorpayPaymentModal;
