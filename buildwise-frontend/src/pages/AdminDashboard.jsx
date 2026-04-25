/**
 * Admin Dashboard Page
 * Shows overview and quick stats
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { usePricingRequests } from '../hooks/usePricingRequests';
import { usePayments } from '../hooks/usePayments';
import { formatCurrency, formatDateOnly } from '../utils/adminUtils';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { requests, loading: requestsLoading, error: requestsError } = usePricingRequests();
  const { payments, loading: paymentsLoading, error: paymentsError } = usePayments();

  const [stats, setStats] = useState({
    pendingRequests: 0,
    pendingPayments: 0,
    totalCustomers: 0,
    recentRequests: [],
  });

  /**
   * Calculate stats
   */
  useEffect(() => {
    const pendingReqs = requests.filter(r => r.status === 'pending').length;
    const pendingPays = payments.filter(p => p.payment_status === 'pending').length;
    const uniqueCustomers = new Set(requests.map(r => r.user_id)).size;

    const recent = requests
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    setStats({
      pendingRequests: pendingReqs,
      pendingPayments: pendingPays,
      totalCustomers: uniqueCustomers,
      recentRequests: recent,
    });
  }, [requests, payments]);

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to BuildWise Admin Panel</p>
      </div>

      {/* Errors */}
      {requestsError && (
        <Alert type="error" message={`Requests Error: ${requestsError}`} />
      )}
      {paymentsError && (
        <Alert type="error" message={`Payments Error: ${paymentsError}`} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Pending Requests */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">📋 Pending Requests</p>
            <p className="text-4xl font-bold text-yellow-700">{stats.pendingRequests}</p>
            <p className="text-xs text-gray-600 mt-2">Awaiting approval</p>
          </div>
        </Card>

        {/* Pending Payments */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">💳 Pending Payments</p>
            <p className="text-4xl font-bold text-red-700">{stats.pendingPayments}</p>
            <p className="text-xs text-gray-600 mt-2">Awaiting customer payment</p>
          </div>
        </Card>

        {/* Total Customers */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">👥 Total Customers</p>
            <p className="text-4xl font-bold text-blue-700">{stats.totalCustomers}</p>
            <p className="text-xs text-gray-600 mt-2">Unique pricing requests</p>
          </div>
        </Card>
      </div>

      {/* Recent Requests Section */}
      <Card title="📊 Recent Pricing Requests" subtitle="Latest 5 requests submitted">
        {requestsLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">⏳ Loading requests...</p>
          </div>
        ) : stats.recentRequests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No requests yet</p>
          </div>
        ) : (
          <div>
            <div className="space-y-3">
              {stats.recentRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{request.company_name}</p>
                    <p className="text-sm text-gray-600">
                      ID: #{request.id} • {formatDateOnly(request.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : request.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="ml-4"
                    onClick={() => navigate(`/admin/pricing/requests/${request.id}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>

            {/* View All Button */}
            <div className="mt-6 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin/pricing/requests')}
              >
                View All Requests →
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Requests Card */}
        <Card className="text-center py-8">
          <p className="text-2xl mb-3">📋</p>
          <h3 className="text-lg font-bold text-gray-800 mb-3">View All Requests</h3>
          <p className="text-sm text-gray-600 mb-6">
            Review and manage all pricing requests
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate('/admin/pricing/requests')}
          >
            Go to Requests
          </Button>
        </Card>

        {/* Payments Card */}
        <Card className="text-center py-8">
          <p className="text-2xl mb-3">💳</p>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Manage Payments</h3>
          <p className="text-sm text-gray-600 mb-6">
            Create orders and track payment status
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate('/admin/pricing/payments')}
          >
            Go to Payments
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
};
