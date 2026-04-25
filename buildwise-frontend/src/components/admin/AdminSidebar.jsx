/**
 * AdminSidebar Component
 * Navigation sidebar for admin panel
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const AdminSidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/pricing/requests', label: 'Pricing Requests', icon: '📋' },
    { path: '/admin/pricing/payments', label: 'Payments', icon: '💳' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen shadow-lg">
      <nav className="p-4">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-blue-400">Admin Menu</h2>
        </div>

        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded transition ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer info */}
      <div className="absolute bottom-4 left-4 right-4 p-4 bg-gray-700 rounded text-xs text-gray-300">
        <p className="font-semibold text-gray-200 mb-2">Need Help?</p>
        <p>Email: support@buildwise.app</p>
        <p>Phone: +1-800-BUILD-WISE</p>
      </div>
    </aside>
  );
};
