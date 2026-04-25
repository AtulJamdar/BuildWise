/**
 * Request Detail & Approval Page
 * Shows full request details and approval/rejection forms
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Input } from '../components/admin/Input';
import { Alert } from '../components/admin/Alert';
import { usePricingRequests } from '../hooks/usePricingRequests';
import { validateApprovalForm, validateRejectionForm } from '../utils/formValidation';
import { parseError } from '../utils/errorHandler';
import { formatCurrency, formatDateOnly } from '../utils/adminUtils';
import { approvePricingRequest, rejectPricingRequest } from '../services/adminApi';

const FEATURE_OPTIONS = [
  { id: 'static-analysis', label: 'Static Code Analysis' },
  { id: 'security-scan', label: 'Security Scanning' },
  { id: 'performance', label: 'Performance Analysis' },
  { id: 'bug-detection', label: 'Bug Detection' },
  { id: 'compliance', label: 'Compliance Reporting' },
  { id: 'advanced-ai', label: 'Advanced AI Analysis' },
];

export const RequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { fetchRequestById } = usePricingRequests();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [successMessage, setSuccessMessage] = useState('');

  // Approval form state
  const [approvalForm, setApprovalForm] = useState({
    customPrice: '',
    scansPerMonth: '',
    validityDays: '365',
    features: [],
    approvalNotes: '',
  });
  const [approvalErrors, setApprovalErrors] = useState({});
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Rejection form state
  const [rejectionForm, setRejectionForm] = useState({ reason: '' });
  const [rejectionErrors, setRejectionErrors] = useState({});
  const [rejectionLoading, setRejectionLoading] = useState(false);

  /**
   * Load request on mount
   */
  useEffect(() => {
    const loadRequest = async () => {
      try {
        setLoading(true);
        const data = await fetchRequestById(requestId);
        if (data) {
          setRequest(data.request || data);
        } else {
          setError('Failed to load request');
        }
      } catch (err) {
        setError(parseError(err));
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId, fetchRequestById]);

  /**
   * Handle approval form change
   */
  const handleApprovalChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setApprovalForm(prev => ({
        ...prev,
        features: checked
          ? [...prev.features, value]
          : prev.features.filter(f => f !== value)
      }));
    } else {
      setApprovalForm(prev => ({ ...prev, [name]: value }));
    }

    // Clear error
    if (approvalErrors[name]) {
      setApprovalErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Handle rejection form change
   */
  const handleRejectionChange = (e) => {
    const { name, value } = e.target;
    setRejectionForm(prev => ({ ...prev, [name]: value }));
    if (rejectionErrors[name]) {
      setRejectionErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Submit approval
   */
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setError('');

    // Validate
    const { isValid, errors } = validateApprovalForm(approvalForm);
    if (!isValid) {
      setApprovalErrors(errors);
      return;
    }

    if (!window.confirm('Are you sure you want to approve this request?')) {
      return;
    }

    setApprovalLoading(true);
    try {
      await approvePricingRequest(requestId, approvalForm);
      setSuccessMessage('✓ Request approved successfully!');
      setTimeout(() => {
        navigate('/admin/pricing/requests');
      }, 1500);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setApprovalLoading(false);
    }
  };

  /**
   * Submit rejection
   */
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setError('');

    // Validate
    const { isValid, errors } = validateRejectionForm(rejectionForm.reason);
    if (!isValid) {
      setRejectionErrors(errors);
      return;
    }

    if (!window.confirm('Are you sure you want to reject this request?')) {
      return;
    }

    setRejectionLoading(true);
    try {
      await rejectPricingRequest(requestId, rejectionForm.reason);
      setSuccessMessage('✓ Request rejected successfully!');
      setTimeout(() => {
        navigate('/admin/pricing/requests');
      }, 1500);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setRejectionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <Card className="text-center py-12">
          <p className="text-gray-600">⏳ Loading request...</p>
        </Card>
      </AdminLayout>
    );
  }

  if (!request) {
    return (
      <AdminLayout>
        <Card className="text-center py-12">
          <p className="text-red-600 font-semibold">Request not found</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/admin/pricing/requests')}
          >
            Back to Requests
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-blue-100 text-blue-800',
    };
    return styles[status] || styles.pending;
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{request.company_name}</h1>
          <p className="text-gray-600 mt-2">Request #{request.id}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-4 py-2 rounded-full font-semibold ${getStatusBadge(request.status)}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/pricing/requests')}
          >
            ← Back
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === 'details'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          📋 Request Details
        </button>
        {request.status === 'pending' && (
          <button
            onClick={() => setActiveTab('review')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'review'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            ✅ Approve / ❌ Reject
          </button>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info */}
          <Card title="👤 Customer Information">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 font-semibold">Company Name</p>
                <p className="text-lg font-bold text-gray-800">{request.company_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold">Team Size</p>
                <p className="text-lg font-bold text-gray-800">{request.team_size} members</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold">Submitted On</p>
                <p className="text-lg font-bold text-gray-800">{formatDateOnly(request.created_at)}</p>
              </div>
            </div>
          </Card>

          {/* Requirements */}
          <Card title="📋 Requirements">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 font-semibold">Scans Per Month</p>
                <p className="text-lg font-bold text-gray-800">{request.scans_per_month}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold">Budget Range</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatCurrency(request.budget_min)} - {formatCurrency(request.budget_max)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold">Specific Features</p>
                <p className="text-base text-gray-800 mt-2 p-3 bg-gray-50 rounded">
                  {request.specific_features || 'No specific features mentioned'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Review Tab */}
      {activeTab === 'review' && request.status === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Approval Form */}
          <Card title="✅ Approve Request" className="border-l-4 border-green-500">
            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <Input
                label="Custom Price (₹)"
                name="customPrice"
                type="number"
                value={approvalForm.customPrice}
                onChange={handleApprovalChange}
                error={approvalErrors.customPrice}
                placeholder="Enter price"
                required
              />

              <Input
                label="Scans Per Month"
                name="scansPerMonth"
                type="number"
                value={approvalForm.scansPerMonth}
                onChange={handleApprovalChange}
                error={approvalErrors.scansPerMonth}
                placeholder="Enter scans"
                required
              />

              <Input
                label="Plan Validity (Days)"
                name="validityDays"
                type="number"
                value={approvalForm.validityDays}
                onChange={handleApprovalChange}
                error={approvalErrors.validityDays}
                placeholder="365"
                required
              />

              {/* Features */}
              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  Features
                  <span className="text-red-600 ml-1">*</span>
                </label>
                <div className="space-y-2">
                  {FEATURE_OPTIONS.map(feature => (
                    <label key={feature.id} className="flex items-center">
                      <input
                        type="checkbox"
                        value={feature.id}
                        checked={approvalForm.features.includes(feature.id)}
                        onChange={handleApprovalChange}
                        className="mr-3 w-4 h-4"
                      />
                      <span className="text-gray-700">{feature.label}</span>
                    </label>
                  ))}
                </div>
                {approvalErrors.features && (
                  <p className="text-red-600 text-sm mt-2">{approvalErrors.features}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Approval Notes</label>
                <textarea
                  name="approvalNotes"
                  value={approvalForm.approvalNotes}
                  onChange={handleApprovalChange}
                  placeholder="Add any notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="4"
                />
              </div>

              <Button
                type="submit"
                variant="success"
                loading={approvalLoading}
                disabled={approvalLoading}
                className="w-full"
              >
                ✅ Approve Request
              </Button>
            </form>
          </Card>

          {/* Rejection Form */}
          <Card title="❌ Reject Request" className="border-l-4 border-red-500">
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Rejection Reason
                  <span className="text-red-600 ml-1">*</span>
                </label>
                <textarea
                  name="reason"
                  value={rejectionForm.reason}
                  onChange={handleRejectionChange}
                  placeholder="Explain why this request is being rejected..."
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    rejectionErrors.reason
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-red-500'
                  }`}
                  rows="6"
                />
                {rejectionErrors.reason && (
                  <p className="text-red-600 text-sm mt-2">{rejectionErrors.reason}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="danger"
                loading={rejectionLoading}
                disabled={rejectionLoading}
                className="w-full"
              >
                ❌ Reject Request
              </Button>
            </form>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
};
