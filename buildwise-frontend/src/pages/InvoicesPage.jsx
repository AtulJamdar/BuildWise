/**
 * Invoices Management Page
 * Shows all invoices and handles downloads
 */

import React, { useState } from 'react';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { useInvoices, downloadInvoice } from '../hooks/usePlanManagement';
import { formatCurrency, formatDate } from '../utils/customerUtils';

export const InvoicesPage = () => {
  const { invoices, loading, error, refetch } = useInvoices();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  /**
   * Handle invoice download
   */
  const handleDownload = async (invoiceId) => {
    setDownloadingId(invoiceId);
    setDownloadError('');
    try {
      await downloadInvoice(invoiceId);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Group invoices by year-month
  const groupedInvoices = invoices.reduce((acc, invoice) => {
    const date = new Date(invoice.created_at);
    const key = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(invoice);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">📄 Invoices</h1>
          <p className="text-gray-600 mt-2">Download and manage your invoices</p>
        </div>

        {/* Errors */}
        {error && <Alert type="error" message={error} />}
        {downloadError && <Alert type="error" message={downloadError} onClose={() => setDownloadError('')} />}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <p className="text-sm font-semibold text-gray-600">📊 Total Invoices</p>
            <p className="text-3xl font-bold text-blue-700 mt-2">{invoices.length}</p>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
            <p className="text-sm font-semibold text-gray-600">✓ Paid</p>
            <p className="text-3xl font-bold text-green-700 mt-2">
              {invoices.filter(i => i.status === 'paid').length}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
            <p className="text-sm font-semibold text-gray-600">⏳ Pending</p>
            <p className="text-3xl font-bold text-orange-700 mt-2">
              {invoices.filter(i => i.status === 'pending').length}
            </p>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <Card className="text-center py-12">
            <p className="text-gray-600">⏳ Loading invoices...</p>
          </Card>
        ) : invoices.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-2xl mb-3">📭</p>
            <p className="text-gray-600 font-semibold">No invoices yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Invoices will appear here once you complete your first payment
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedInvoices).map(([month, monthInvoices]) => (
              <div key={month}>
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-3 border-b">
                  {month}
                </h3>

                <div className="space-y-3">
                  {monthInvoices.map(invoice => {
                    const statusColors = {
                      paid: 'bg-green-100 text-green-800',
                      pending: 'bg-yellow-100 text-yellow-800',
                      overdue: 'bg-red-100 text-red-800',
                    };

                    return (
                      <Card key={invoice.id} className="hover:shadow-lg transition">
                        <div className="flex items-center justify-between">
                          {/* Invoice Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div>
                                <h4 className="font-bold text-gray-800">Invoice #{invoice.id}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {invoice.plan_name || 'Custom Plan'} • {formatDate(invoice.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right mr-6">
                            <p className="text-2xl font-bold text-gray-800">
                              {formatCurrency(invoice.amount)}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div>
                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                statusColors[invoice.status] || statusColors.pending
                              }`}
                            >
                              {invoice.status === 'paid'
                                ? '✓ Paid'
                                : invoice.status === 'pending'
                                ? '⏳ Pending'
                                : '❌ Overdue'}
                            </span>
                          </div>

                          {/* Download Button */}
                          <Button
                            variant="primary"
                            size="sm"
                            className="ml-4"
                            loading={downloadingId === invoice.id}
                            disabled={downloadingId === invoice.id}
                            onClick={() => handleDownload(invoice.id)}
                          >
                            📥 Download
                          </Button>
                        </div>

                        {/* Invoice Details */}
                        <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Invoice Date</p>
                            <p className="font-bold text-gray-800">{formatDate(invoice.created_at)}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Due Date</p>
                            <p className="font-bold text-gray-800">
                              {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Reference</p>
                            <p className="font-mono text-sm text-gray-800">{invoice.reference_id}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Company</p>
                            <p className="font-bold text-gray-800">{invoice.company_name}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        {invoices.length > 0 && (
          <Card title="❓ Invoice Help" className="mt-12">
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">How do I download an invoice?</h4>
                <p className="text-sm text-gray-700">
                  Click the "Download" button on any invoice to download a PDF copy.
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-800 mb-2">What information is included in an invoice?</h4>
                <p className="text-sm text-gray-700">
                  Our invoices include plan details, pricing, GST (if applicable), and payment terms.
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-800 mb-2">Can I get a duplicate invoice?</h4>
                <p className="text-sm text-gray-700">
                  Yes! You can download any past invoice anytime from this page.
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-800 mb-2">Need further assistance?</h4>
                <p className="text-sm text-gray-700">
                  Contact our support team at{' '}
                  <a href="mailto:support@buildwise.app" className="text-blue-600 hover:underline">
                    support@buildwise.app
                  </a>
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
