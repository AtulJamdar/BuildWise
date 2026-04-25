/**
 * Pricing Requests List Page
 * Shows all pricing requests with filtering
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { RequestCard } from '../components/admin/RequestCard';
import { usePricingRequests } from '../hooks/usePricingRequests';
import { formatDateOnly } from '../utils/adminUtils';

export const PricingRequestsList = () => {
  const navigate = useNavigate();
  const { requests, loading, error, filter, setFilter } = usePricingRequests();
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Filter requests by search term
   */
  const filteredRequests = requests.filter(req =>
    req.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.id.toString().includes(searchTerm)
  );

  /**
   * Handle request selection
   */
  const handleViewDetails = (requestId) => {
    navigate(`/admin/pricing/requests/${requestId}`);
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Pricing Requests</h1>
        <p className="text-gray-600 mt-2">Manage customer pricing requests</p>
      </div>

      {/* Error */}
      {error && <Alert type="error" message={error} />}

      {/* Filters Card */}
      <Card title="🔍 Filters" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by company or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Results Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Results
            </label>
            <div className="flex items-center h-10 px-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-lg font-bold text-blue-600">{filteredRequests.length}</span>
              <span className="ml-2 text-gray-600">requests</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Requests List */}
      <div>
        {loading ? (
          <Card className="text-center py-12">
            <p className="text-gray-600 mb-2">⏳ Loading requests...</p>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-gray-600 font-semibold">No requests found</p>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Info */}
      {filteredRequests.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
          <p>
            Showing {filteredRequests.length} of {requests.length} total requests
          </p>
        </div>
      )}
    </AdminLayout>
  );
};
