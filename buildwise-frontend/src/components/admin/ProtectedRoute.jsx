/**
 * ProtectedRoute Component
 * Wraps routes that require admin authentication
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin">⏳</div>
          <p className="mt-4 text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};
