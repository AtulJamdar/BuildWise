/**
 * Plan Analytics Dashboard
 * Shows usage, analytics, and plan health metrics
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/admin/Card';
import { Button } from '../components/admin/Button';
import { Alert } from '../components/admin/Alert';
import { usePlanAnalytics } from '../hooks/usePlanManagement';
import { usePricingRequests } from '../hooks/usePricingRequests';
import {
  calculateUsagePercentage,
  getUsageStatus,
  getUsageStatusColor,
  calculateDaysRemaining,
  getExpiryStatus,
  getExpiryStatusColor,
  estimateDaysUntilLimitReached,
  formatChartData,
} from '../utils/usageTrackingUtils';
import { formatDate, formatCurrency } from '../utils/customerUtils';

export const PlanAnalytics = () => {
  const { planId } = useParams();
  const { usage, loading: usageLoading, error: usageError } = usePlanAnalytics(planId);
  const { fetchRequestById } = usePricingRequests();
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  React.useEffect(() => {
    const loadPlan = async () => {
      try {
        const data = await fetchRequestById(planId);
        setPlan(data?.plan || data);
      } catch (error) {
        console.error('Failed to load plan:', error);
      } finally {
        setPlanLoading(false);
      }
    };
    loadPlan();
  }, [planId, fetchRequestById]);

  if (planLoading || usageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Card className="text-center py-12">
            <p className="text-gray-600">⏳ Loading analytics...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!plan || !usage) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Card className="text-center py-12">
            <p className="text-red-600 font-semibold">Plan not found</p>
          </Card>
        </div>
      </div>
    );
  }

  const usagePercentage = calculateUsagePercentage(usage.total_scans, plan.scans_per_month);
  const usageStatus = getUsageStatus(usagePercentage);
  const daysRemaining = calculateDaysRemaining(plan.expires_at);
  const expiryStatus = getExpiryStatus(daysRemaining);
  const daysUntilLimit = estimateDaysUntilLimitReached(
    usage.total_scans,
    plan.scans_per_month,
    usage.avg_daily_scans
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Plan Analytics</h1>
          <p className="text-gray-600 mt-2">{plan.company_name || 'Your Plan'}</p>
        </div>

        {/* Error Alerts */}
        {usageError && <Alert type="error" message={usageError} />}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Usage Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <p className="text-sm font-semibold text-gray-600">📊 Scans Used</p>
            <p className="text-3xl font-bold text-blue-700 mt-3">
              {usage.total_scans?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              of {plan.scans_per_month?.toLocaleString()} monthly
            </p>
          </Card>

          {/* Usage Percentage */}
          <Card className={`bg-gradient-to-br border-l-4 ${getUsageStatusColor(usageStatus)}`}>
            <p className="text-sm font-semibold text-gray-600">📈 Usage Rate</p>
            <p className="text-3xl font-bold mt-3">{usagePercentage}%</p>
            <p className="text-xs text-gray-600 mt-2">
              {usageStatus === 'critical'
                ? '🚨 Critical'
                : usageStatus === 'warning'
                ? '⚠️ Warning'
                : usageStatus === 'moderate'
                ? '📊 Moderate'
                : '✅ Low'}
            </p>
          </Card>

          {/* Daily Average */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
            <p className="text-sm font-semibold text-gray-600">📅 Daily Average</p>
            <p className="text-3xl font-bold text-purple-700 mt-3">
              {usage.avg_daily_scans?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-600 mt-2">scans per day</p>
          </Card>

          {/* Days Remaining */}
          <Card className={`bg-gradient-to-br border-l-4 ${getExpiryStatusColor(expiryStatus)}`}>
            <p className="text-sm font-semibold text-gray-600">⏱️ Days Remaining</p>
            <p className="text-3xl font-bold mt-3">{daysRemaining}</p>
            <p className="text-xs text-gray-600 mt-2">
              {expiryStatus === 'expired'
                ? '❌ Expired'
                : expiryStatus === 'expiring-soon'
                ? '🔴 Expiring Soon'
                : expiryStatus === 'approaching'
                ? '🟡 Approaching'
                : '🟢 Active'}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Usage Details */}
          <div className="lg:col-span-2">
            {/* Usage Progress */}
            <Card title="📊 Monthly Usage Progress" className="mb-6">
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Usage Progress</span>
                    <span className="text-sm font-bold text-gray-800">{usagePercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        usageStatus === 'critical'
                          ? 'bg-red-500'
                          : usageStatus === 'warning'
                          ? 'bg-yellow-500'
                          : usageStatus === 'moderate'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-semibold">Used</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">
                      {usage.total_scans?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-semibold">Remaining</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">
                      {(plan.scans_per_month - (usage.total_scans || 0))?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-semibold">Total</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">
                      {plan.scans_per_month?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recent Usage */}
            <Card title="📈 Recent Activity" subtitle="Last 7 days">
              {usage.usage_history && usage.usage_history.length > 0 ? (
                <div className="space-y-2">
                  {usage.usage_history.slice(0, 7).map((day, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{formatDate(day.date)}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-800">{day.scans_count} scans</span>
                        <div className="w-32 bg-gray-200 rounded h-2">
                          <div
                            className="bg-blue-500 h-2 rounded transition-all"
                            style={{
                              width: `${Math.min((day.scans_count / (usage.avg_daily_scans || 1)) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">No usage data available yet</p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            {/* Plan Info */}
            <Card title="📋 Plan Details" className="mb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Plan Amount</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatCurrency(plan.custom_price)}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Active Since</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {formatDate(plan.created_at)}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Expires On</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {formatDate(plan.expires_at)}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Monthly Limit</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {plan.scans_per_month?.toLocaleString()} scans
                  </p>
                </div>
              </div>
            </Card>

            {/* Estimated Info */}
            <Card title="⏱️ Estimates">
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Until Limit Reached</p>
                  <p className="text-lg font-bold text-blue-700 mt-1">
                    {daysUntilLimit > 0 ? `${daysUntilLimit} days` : 'Already reached'}
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Plan Expiry</p>
                  <p className="text-lg font-bold text-green-700 mt-1">
                    {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Warnings */}
        {usagePercentage > 80 && (
          <Alert
            type="warning"
            message={`⚠️ You've used ${usagePercentage}% of your monthly scans. Consider upgrading to a higher plan.`}
          />
        )}

        {daysRemaining <= 7 && daysRemaining > 0 && (
          <Alert
            type="warning"
            message={`⏰ Your plan expires in ${daysRemaining} days. Plan renewal will be available soon.`}
          />
        )}

        {daysRemaining <= 0 && (
          <Alert
            type="error"
            message="❌ Your plan has expired. Please renew to continue using BuildWise."
          />
        )}
      </div>
    </div>
  );
};
