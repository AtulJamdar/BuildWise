/**
 * Alert Component
 * Display alerts/messages
 */

import React from 'react';

export const Alert = ({ type = 'info', message, onClose }) => {
  const typeStyles = {
    success: 'bg-green-100 border-green-500 text-green-800',
    error: 'bg-red-100 border-red-500 text-red-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    info: 'bg-blue-100 border-blue-500 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ⓘ',
  };

  return (
    <div className={`border-l-4 p-4 mb-4 ${typeStyles[type]} rounded`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <span className="text-xl font-bold mr-3">{icons[type]}</span>
          <span className="flex-1">{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-lg font-bold ml-2 hover:opacity-70"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
