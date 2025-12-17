'use client';

import { useState, useEffect, useCallback } from 'react';
import { timeManagementService, BreakPermission } from '@/app/services/time-management';
import { useAuth } from '@/app/context/AuthContext';

export default function BreakPermissionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<BreakPermission[]>([]);
  const [maxLimit, setMaxLimit] = useState<number>(180); // Default 3 hours
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMaxLimitModal, setShowMaxLimitModal] = useState(false);
  const [newMaxLimit, setNewMaxLimit] = useState<string>('180');

  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    reason: '',
  });

  // Fetch break permissions and today's record
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get employee's break permissions
      try {
        // Try specific employee endpoint first, fallback to generic with query
        let permResponse = await timeManagementService.getEmployeeBreakPermissions(user.id);

        // If specific endpoint fails (404), try generic endpoint with query
        if (permResponse && (permResponse.error || permResponse.status === 404)) {
          console.warn('Employee break permissions endpoint failed, trying generic endpoint...');
          permResponse = await timeManagementService.getAllBreakPermissions(user.id);
        }

        if (Array.isArray(permResponse)) {
          setPermissions(permResponse);
        } else if (permResponse && Array.isArray(permResponse.data)) {
          setPermissions(permResponse.data);
        } else {
          setPermissions([]);
        }
      } catch (err: unknown) {
        console.warn('Could not fetch break permissions:', err);
        setPermissions([]);
      }

      // Get today's attendance record
      try {
        const recordResponse = await timeManagementService.getTodayRecord(user.id);
        if (recordResponse && recordResponse.data) {
          setTodayRecord(recordResponse.data);
        } else if (recordResponse) {
          setTodayRecord(recordResponse);
        }
      } catch (err: unknown) {
        console.warn('Could not fetch today record:', err);
        setTodayRecord(null);
      }

      // Get permission limit
      try {
        const limitResponse = await timeManagementService.getPermissionLimit();
        if (limitResponse && typeof limitResponse === 'object') {
          const maxMinutes = (limitResponse as unknown as { maxMinutes?: number }).maxMinutes ||
                            (limitResponse as unknown as { data?: { maxMinutes?: number } }).data?.maxMinutes;
          if (typeof maxMinutes === 'number') {
            setMaxLimit(maxMinutes);
          }
        }
      } catch (err: unknown) {
        console.warn('Could not fetch permission limit:', err);
      }
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      setError('Failed to load break permissions');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchData]);

  // Calculate duration in minutes
  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`${new Date().toISOString().split('T')[0]}T${startTime}`);
    const end = new Date(`${new Date().toISOString().split('T')[0]}T${endTime}`);
    return Math.ceil((end.getTime() - start.getTime()) / 60000);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.startTime || !formData.endTime || !formData.reason.trim()) {
      setError('Please fill in all fields');
      return false;
    }

    const duration = calculateDuration(formData.startTime, formData.endTime);
    if (duration <= 0) {
      setError('End time must be after start time');
      return false;
    }

    if (duration > maxLimit) {
      setError(`Break duration cannot exceed ${maxLimit} minutes`);
      return false;
    }

    if (!todayRecord?._id) {
      setError('No attendance record found for today. Please clock in first.');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const startDateTime = `${today}T${formData.startTime}:00Z`;
      const endDateTime = `${today}T${formData.endTime}:00Z`;

      const response = await timeManagementService.createBreakPermission({
        employeeId: user!.id,
        attendanceRecordId: todayRecord._id,
        startTime: startDateTime,
        endTime: endDateTime,
        reason: formData.reason,
      });

      if (response?.error) {
        setError(response.error);
      } else if (response && response.status >= 400) {
        setError('Failed to submit break permission');
      } else {
        setSuccess('Break permission request submitted successfully');
        setFormData({ startTime: '', endTime: '', reason: '' });
        setShowForm(false);
        await fetchData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit break permission';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete permission
  const handleDelete = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this break permission request?')) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.deleteBreakPermission(user!.id, permissionId);

      if (response?.error) {
        setError(response.error);
      } else if (response && response.status >= 400) {
        setError('Failed to delete break permission');
      } else {
        setSuccess('Break permission deleted successfully');
        await fetchData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete break permission';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update max break limit
  const handleUpdateMaxLimit = async () => {
    const newMinutes = parseInt(newMaxLimit, 10);

    if (isNaN(newMinutes) || newMinutes <= 0) {
      setError('Maximum break duration must be a positive number');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.setPermissionLimit(newMinutes, user!.id);

      if (response?.error) {
        setError(response.error);
      } else if (response && response.status >= 400) {
        setError('Failed to update maximum break duration');
      } else {
        setSuccess(`Maximum break duration updated to ${newMinutes} minutes successfully`);
        setMaxLimit(newMinutes);
        setShowMaxLimitModal(false);
        setNewMaxLimit('180');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update maximum break duration';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Format time for display
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Break Permissions</h1>
            <p className="text-muted-foreground mt-1">
              Request and manage break time permissions
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Permission Limit Info */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            <strong>Maximum break duration:</strong> {maxLimit} minutes ({Math.floor(maxLimit / 60)}h {maxLimit % 60}m)
          </p>
          <button
            onClick={() => {
              setNewMaxLimit(maxLimit.toString());
              setShowMaxLimitModal(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Edit Limit
          </button>
        </div>

        {/* New Request Button and Form */}
        <div className="bg-card rounded-xl border border-border p-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={submitting || !todayRecord}
            >
              {!todayRecord ? 'Clock in to request break' : 'Request Break Permission'}
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">New Break Permission Request</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Duration Display */}
              {formData.startTime && formData.endTime && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-foreground">
                    Duration: <span className="font-semibold">{calculateDuration(formData.startTime, formData.endTime)} minutes</span>
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reason *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder="e.g., Lunch break, Medical appointment, etc."
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Permissions List */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Break Permission Requests</h2>

          {permissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No break permissions found. Request one to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm._id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 text-sm text-foreground">
                        {new Date(perm.startTime).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {formatTime(perm.startTime)} - {formatTime(perm.endTime)}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {perm.duration}m
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {perm.reason}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(perm.status)}`}>
                          {perm.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {perm.status === 'PENDING' && (
                          <button
                            onClick={() => handleDelete(perm._id)}
                            className="text-destructive hover:text-destructive/80 font-medium transition-colors"
                            disabled={submitting}
                          >
                            Delete
                          </button>
                        )}
                        {perm.status !== 'PENDING' && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Max Limit Modal */}
        {showMaxLimitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Edit Maximum Break Duration</h2>
                <button
                  onClick={() => {
                    setShowMaxLimitModal(false);
                    setNewMaxLimit('180');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Maximum Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={newMaxLimit}
                    onChange={(e) => setNewMaxLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter maximum duration in minutes"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {maxLimit} minutes ({Math.floor(maxLimit / 60)}h {maxLimit % 60}m)
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-2">Preview:</p>
                  <p className="text-sm text-muted-foreground">
                    New maximum: {isNaN(parseInt(newMaxLimit, 10)) ? '—' : `${parseInt(newMaxLimit, 10)} minutes (${Math.floor(parseInt(newMaxLimit, 10) / 60)}h ${parseInt(newMaxLimit, 10) % 60}m)`}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleUpdateMaxLimit}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Updating...' : 'Update Limit'}
                  </button>
                  <button
                    onClick={() => {
                      setShowMaxLimitModal(false);
                      setNewMaxLimit('180');
                    }}
                    disabled={submitting}
                    className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

