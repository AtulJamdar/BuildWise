/**
 * Card Component
 * Reusable card container for content
 */

import React from 'react';

export const Card = ({ children, className = '', title, subtitle }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && (
        <div className="mb-4 pb-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
