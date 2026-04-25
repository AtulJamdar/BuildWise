/**
 * Customer Routes Configuration
 * Sets up all customer pricing workflow routes
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PricingRequestForm } from '../pages/PricingRequestForm';
import { PricingRequestsTracker } from '../pages/PricingRequestsTracker';
import { CustomPlanDetails } from '../pages/CustomPlanDetails';
import { PaymentConfirmation } from '../pages/PaymentConfirmation';

export const CustomerPricingRoutes = () => {
  return (
    <Routes>
      {/* Request Form */}
      <Route path="request-form" element={<PricingRequestForm />} />

      {/* Requests Tracker */}
      <Route path="requests" element={<PricingRequestsTracker />} />

      {/* Plan Details & Payment */}
      <Route path="requests/:requestId" element={<CustomPlanDetails />} />

      {/* Payment Confirmation */}
      <Route path="payment-confirmation/:requestId" element={<PaymentConfirmation />} />

      {/* Redirect /pricing to /pricing/requests */}
      <Route path="/" element={<Navigate to="/pricing/requests" replace />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
              <p className="text-gray-600 mb-6">Page not found</p>
              <a
                href="/pricing/requests"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Pricing
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};
