"use client";

import { useState, useEffect } from 'react';
import { analytics, type AnalyticsData } from '@/lib/observability/analytics';
import { logger } from '@/lib/observability/logger';
import { Button } from '@/components/ui/button';

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    setAnalyticsData(analytics.getAnalytics());
    setIsEnabled(analytics.isEnabled());
  }, []);

  const refreshData = () => {
    setAnalyticsData(analytics.getAnalytics());
  };

  const toggleAnalytics = () => {
    const newState = !isEnabled;
    analytics.setEnabled(newState);
    setIsEnabled(newState);
    refreshData();
  };

  const exportData = () => {
    const data = analytics.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventhub-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      analytics.clearData();
      logger.clearLogs();
      refreshData();
    }
  };

  if (!analyticsData) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Analytics Dashboard</h2>
        <p className="text-neutral-600">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-900">Analytics Dashboard</h2>
        <div className="flex gap-4">
          <Button
            onClick={toggleAnalytics}
            variant={isEnabled ? "primary" : "secondary"}
          >
            {isEnabled ? "Analytics Enabled" : "Analytics Disabled"}
          </Button>
          <Button onClick={refreshData} variant="secondary">
            Refresh
          </Button>
          <Button onClick={exportData} variant="ghost">
            Export Data
          </Button>
          <Button onClick={clearData} variant="danger">
            Clear Data
          </Button>
        </div>
      </div>

      {!isEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            Analytics is currently disabled. Enable it to start tracking usage patterns.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Events</h3>
          <p className="text-3xl font-bold text-neutral-900">{analyticsData.summary.totalEvents}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-neutral-600 mb-2">Page Views</h3>
          <p className="text-3xl font-bold text-neutral-900">{analyticsData.summary.pageViews}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-neutral-600 mb-2">User Actions</h3>
          <p className="text-3xl font-bold text-neutral-900">{analyticsData.summary.userActions}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-neutral-600 mb-2">Errors</h3>
          <p className="text-3xl font-bold text-red-600">{analyticsData.summary.errors}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular Pages */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Popular Pages</h3>
          {analyticsData.popularPages.length > 0 ? (
            <div className="space-y-3">
              {analyticsData.popularPages.map((page, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-neutral-700">{page.page}</span>
                  <span className="text-neutral-600 font-medium">{page.count} views</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500">No page views recorded yet</p>
          )}
        </div>

        {/* Common Actions */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Common Actions</h3>
          {analyticsData.commonActions.length > 0 ? (
            <div className="space-y-3">
              {analyticsData.commonActions.map((action, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-neutral-700">{action.action}</span>
                  <span className="text-neutral-600 font-medium">{action.count} times</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500">No actions recorded yet</p>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-neutral-600 mb-2">Average Performance</h4>
            <p className="text-2xl font-bold text-neutral-900">{analyticsData.summary.avgPerformance}ms</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-neutral-600 mb-2">Events Retained</h4>
            <p className="text-2xl font-bold text-neutral-900">
              {analyticsData.retention.eventsKept} / {analyticsData.retention.maxEvents}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-neutral-600 mb-2">Retention Period</h4>
            <p className="text-2xl font-bold text-neutral-900">{analyticsData.retention.retentionDays} days</p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Privacy Notice</h4>
        <p className="text-blue-800 text-sm">
          This analytics system is privacy-first. No personal data is collected, no third-party trackers are used,
          and all data is stored locally in your browser. You can clear or export your data at any time.
        </p>
      </div>
    </div>
  );
}
