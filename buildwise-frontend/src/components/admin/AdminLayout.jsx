/**
 * AdminLayout Component
 * Main layout wrapper for admin pages
 */

import React from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <AdminHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
