/**
 * Payment Tracker Page
 * Manage pending and completed payments
 */

import React, { useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { usePayments } from '../hooks/usePayments';
import { formatCurrency, formatDateOnly, daysUntil } from '../utils/adminUtils';
import { parseError } from '../utils/errorHandler';

export const PaymentTracker = () => {
  const { payments, loading, error, createOrder } = usePayments();
  const [paymentLinks, setPaymentLinks] = useState({});
  const [creatingOrder, setCreatingOrder] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Handle create order
   */
  const handleCreateOrder = async (planId) => {
    setCreatingOrder(planId);
    setSuccessMessage('');

    try {
      const response = await createOrder(planId);
      if (response?.payment_link) {
        setPaymentLinks(prev => ({
          ...prev,
          [planId]: response.payment_link
        }));
        setSuccessMessage(`✓ Payment link created! Razorpay Order ID: ${response.razorpay_order_id}`);
      }
    } catch (err) {
      setSuccessMessage(`❌ Error: ${parseError(err)}`);
    } finally {
      setCreatingOrder(null);
    }
  };

  /**
   * Copy link to clipboard
   */
  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setSuccessMessage('✓ Payment link copied to clipboard!');
  };

  // Separate pending and paid plans
  const pendingPlans = payments.filter(p => p.payment_status === 'pending');
  const paidPlans = payments.filter(p => p.payment_status === 'paid');

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Payment Tracker</h1>
        <p className="text-gray-600 mt-2">Manage custom pricing plan payments</p>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} />}
      {successMessage && (
        <Alert
          type={successMessage.includes('❌') ? 'error' : 'success'}
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
          <p className="text-sm font-semibold text-gray-600 mb-2">⏳ Pending Payments</p>
          <p className="text-4xl font-bold text-orange-700">{pendingPlans.length}</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-gray-600 mb-2">✓ Completed Payments</p>
          <p className="text-4xl font-bold text-green-700">{paidPlans.length}</p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
          <p className="text-sm font-semibold text-gray-600 mb-2">💰 Total Expected</p>
          <p className="text-4xl font-bold text-blue-700">
            {formatCurrency(
              pendingPlans.reduce((sum, p) => sum + (p.custom_price || 0), 0)
            )}
          </p>
        </Card>
      </div>

      {/* Pending Payments */}
      <Card title="⏳ Pending Payments" className="mb-8">
        {loading ? (
          <p className="text-center text-gray-600 py-8">⏳ Loading payments...</p>
        ) : pendingPlans.length === 0 ? (
          <p className="text-center text-gray-600 py-8">✓ No pending payments</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Plan ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Days Left</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingPlans.map(plan => {
                  const daysLeft = daysUntil(plan.expires_at);
                  const link = paymentLinks[plan.id];

                  return (
                    <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-4 px-4 font-mono text-sm text-gray-600">#{plan.id}</td>
                      <td className="py-4 px-4 text-gray-800">
                        <p className="font-semibold">{plan.customer_name || 'N/A'}</p>
                        <p className="text-xs text-gray-600">{plan.customer_email || 'N/A'}</p>
                      </td>
                      <td className="py-4 px-4 font-bold text-lg text-gray-800">
                        {formatCurrency(plan.custom_price)}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {formatDateOnly(plan.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-bold px-3 py-1 rounded ${
                          daysLeft > 7
                            ? 'bg-green-100 text-green-800'
                            : daysLeft > 3
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {daysLeft} days
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {link ? (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => copyLink(link)}
                          >
                            📋 Copy Link
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={creatingOrder === plan.id}
                            disabled={creatingOrder === plan.id}
                            onClick={() => handleCreateOrder(plan.id)}
                          >
                            {creatingOrder === plan.id ? 'Creating...' : '🔗 Create Link'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Paid Payments */}
      <Card title="✓ Payment Completed">
        {paidPlans.length === 0 ? (
          <p className="text-center text-gray-600 py-8">No completed payments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Plan ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Paid On</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Expires On</th>
                </tr>
              </thead>
              <tbody>
                {paidPlans.map(plan => (
                  <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-4 px-4 font-mono text-sm text-gray-600">#{plan.id}</td>
                    <td className="py-4 px-4 text-gray-800">
                      <p className="font-semibold">{plan.customer_name || 'N/A'}</p>
                      <p className="text-xs text-gray-600">{plan.customer_email || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-4 font-bold text-lg text-green-600">
                      {formatCurrency(plan.custom_price)}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {formatDateOnly(plan.updated_at)}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {formatDateOnly(plan.expires_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
};
