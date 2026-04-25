/**
 * Admin Routes Configuration
 * Sets up all admin panel routes with protection
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/admin/ProtectedRoute';
import { AdminLogin } from '../pages/AdminLogin';
import { AdminDashboard } from '../pages/AdminDashboard';
import { PricingRequestsList } from '../pages/PricingRequestsList';
import { RequestDetail } from '../pages/RequestDetail';
import { PaymentTracker } from '../pages/PaymentTracker';

export const AdminRoutes = () => {
  return (
    <Routes>
      {/* Login - Public Route */}
      <Route path="login" element={<AdminLogin />} />

      {/* Protected Routes */}
      <Route
        path="dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Pricing Requests */}
      <Route
        path="pricing/requests"
        element={
          <ProtectedRoute>
            <PricingRequestsList />
          </ProtectedRoute>
        }
      />

      <Route
        path="pricing/requests/:requestId"
        element={
          <ProtectedRoute>
            <RequestDetail />
          </ProtectedRoute>
        }
      />

      {/* Payments */}
      <Route
        path="pricing/payments"
        element={
          <ProtectedRoute>
            <PaymentTracker />
          </ProtectedRoute>
        }
      />

      {/* Redirect /admin to /admin/dashboard */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
              <p className="text-gray-600 mb-6">Page not found</p>
              <a
                href="/admin/dashboard"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};
