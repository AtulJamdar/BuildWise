/**
 * RequestCard Component
 * Displays a single pricing request summary
 */

import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

export const RequestCard = ({ request, onViewDetails }) => {
  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <Card className="hover:shadow-lg transition">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{request.company_name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              ID: #{request.id} • {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>
          {getStatusBadge(request.status)}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-600 font-semibold">Team Size</p>
            <p className="text-lg font-bold text-gray-800">{request.team_size} members</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">Scans/Month</p>
            <p className="text-lg font-bold text-gray-800">{request.scans_per_month}</p>
          </div>
        </div>

        {/* Budget */}
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600 font-semibold mb-1">Budget Range</p>
          <p className="text-base font-bold text-gray-800">
            ₹{request.budget_min?.toLocaleString() || 'N/A'} - ₹{request.budget_max?.toLocaleString() || 'N/A'}
          </p>
        </div>

        {/* Features */}
        {request.specific_features && (
          <div>
            <p className="text-xs text-gray-600 font-semibold mb-2">Required Features</p>
            <p className="text-sm text-gray-700">{request.specific_features}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onViewDetails(request.id)}
          >
            View Details & {request.status === 'pending' ? 'Approve/Reject' : 'View Status'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
