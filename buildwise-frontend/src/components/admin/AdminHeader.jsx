/**
 * AdminHeader Component
 * Top navigation bar with user info and logout
 */

import React from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Button } from './Button';

export const AdminHeader = () => {
  const { admin, logout } = useAdminAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      window.location.href = '/admin/login';
    }
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">BuildWise Admin</h1>
          <span className="text-blue-100">|</span>
          <span className="text-blue-100">Custom Pricing Management</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-semibold">{admin?.admin_name || 'Admin'}</p>
            <p className="text-xs text-blue-100">{admin?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-white border-white hover:bg-blue-700"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};
