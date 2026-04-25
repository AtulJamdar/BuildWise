/**
 * Customer Pricing Requests Tracker
 * Shows customer their submitted requests and status
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { usePricingRequests } from '../hooks/usePricingRequests';
import { formatDate, getStatusColor, getStatusLabel } from '../utils/customerUtils';

export const PricingRequestsTracker = () => {
  const navigate = useNavigate();
  const { requests, loading, error } = usePricingRequests();

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const paidRequests = requests.filter(r => r.status === 'paid');

  const RequestRow = ({ request, actionText }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div className="flex-1">
        <p className="font-semibold text-gray-800">{request.company_name}</p>
        <p className="text-sm text-gray-600 mt-1">
          Submitted: {formatDate(request.created_at)} • ID: #{request.id}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
          {getStatusLabel(request.status)}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/pricing/requests/${request.id}`)}
        >
          {actionText}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">My Pricing Requests</h1>
          <p className="text-gray-600 mt-3">Track your custom pricing requests and plans</p>
        </div>

        {/* Error Alert */}
        {error && <Alert type="error" message={error} />}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500">
            <p className="text-sm font-semibold text-gray-600">⏳ Pending</p>
            <p className="text-3xl font-bold text-yellow-700 mt-2">{pendingRequests.length}</p>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
            <p className="text-sm font-semibold text-gray-600">✓ Approved</p>
            <p className="text-3xl font-bold text-green-700 mt-2">{approvedRequests.length}</p>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
            <p className="text-sm font-semibold text-gray-600">❌ Rejected</p>
            <p className="text-3xl font-bold text-red-700 mt-2">{rejectedRequests.length}</p>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <p className="text-sm font-semibold text-gray-600">💳 Active Plans</p>
            <p className="text-3xl font-bold text-blue-700 mt-2">{paidRequests.length}</p>
          </Card>
        </div>

        {/* New Request Button */}
        <div className="mb-8">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/pricing/request-form')}
            className="gap-2"
          >
            ➕ Submit New Request
          </Button>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card title="⏳ Pending Review" subtitle={`${pendingRequests.length} request(s) awaiting admin review`} className="mb-8">
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <RequestRow key={request.id} request={request} actionText="View Details" />
              ))}
            </div>
          </Card>
        )}

        {/* Approved Requests */}
        {approvedRequests.length > 0 && (
          <Card title="✅ Ready to Pay" subtitle={`${approvedRequests.length} custom plan(s) ready for payment`} className="mb-8">
            <div className="space-y-3">
              {approvedRequests.map(request => (
                <RequestRow key={request.id} request={request} actionText="View & Pay" />
              ))}
            </div>
          </Card>
        )}

        {/* Active Plans */}
        {paidRequests.length > 0 && (
          <Card title="💳 Active Plans" subtitle={`${paidRequests.length} plan(s) currently active`} className="mb-8">
            <div className="space-y-3">
              {paidRequests.map(request => (
                <RequestRow key={request.id} request={request} actionText="View Plan" />
              ))}
            </div>
          </Card>
        )}

        {/* Rejected Requests */}
        {rejectedRequests.length > 0 && (
          <Card title="❌ Rejected" subtitle={`${rejectedRequests.length} request(s)`} className="mb-8">
            <div className="space-y-3">
              {rejectedRequests.map(request => (
                <RequestRow key={request.id} request={request} actionText="View Reason" />
              ))}
            </div>
          </Card>
        )}

        {/* Empty State */}
        {loading ? (
          <Card className="text-center py-12">
            <p className="text-gray-600">⏳ Loading your requests...</p>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-2xl mb-3">📭</p>
            <p className="text-gray-600 font-semibold mb-6">No pricing requests yet</p>
            <Button
              variant="primary"
              onClick={() => navigate('/pricing/request-form')}
            >
              ➕ Submit Your First Request
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  );
};
