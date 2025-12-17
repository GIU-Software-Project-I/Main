'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { timeManagementService } from '@/app/services/time-management';
import { useAuth } from '@/app/context/AuthContext';

interface BreakPermission {
  _id: string;
  employeeId: string;
  attendanceRecordId: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export default function BreakPermissionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<BreakPermission[]>([]);
  const [maxLimit, setMaxLimit] = useState<number>(180); // Default 3 hours
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

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
      const permResponse = await timeManagementService.getEmployeeBreakPermissions(user.id);
      if (permResponse.data && Array.isArray(permResponse.data)) {
        setPermissions(permResponse.data);
      } else if (permResponse.error) {
        console.warn('Could not fetch break permissions:', permResponse.error);
        setPermissions([]);
      }

      // Get today's attendance record
      const recordResponse = await timeManagementService.getTodayRecord(user.id);
      if (recordResponse.data) {
        setTodayRecord(recordResponse.data);
      }

      // Get permission limit
      const limitResponse = await timeManagementService.getPermissionLimit();
      if (limitResponse.data && (limitResponse.data as any).maxMinutes) {
        setMaxLimit((limitResponse.data as any).maxMinutes);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load break permissions');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch data on mount and periodically
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate duration in minutes
  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`${new Date().toISOString().split('T')[0]}T${startTime}`);
    const end = new Date(`${new Date().toISOString().split('T')[0]}T${endTime}`);
    return Math.ceil((end.getTime() - start.getTime()) / 60000);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.startTime || !formData.endTime || !formData.reason) {
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

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !todayRecord?._id) {
      if (!todayRecord?._id) {
        setError('No attendance record found for today. Please clock in first.');
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const startDateTime = `${today}T${formData.startTime}`;
      const endDateTime = `${today}T${formData.endTime}`;

      const response = await timeManagementService.createBreakPermission({
        employeeId: user!.id,
        attendanceRecordId: todayRecord._id,
        startTime: startDateTime,
        endTime: endDateTime,
        reason: formData.reason,
      });

      if (response.error) {
        setError(response.error);
      } else {
        setSuccess('Break permission request submitted successfully');
        setFormData({ startTime: '', endTime: '', reason: '' });
        setShowForm(false);
        await fetchData(); // Refresh the list
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit break permission';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete permission
  const handleDelete = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this break permission request?')) return;

    try {
      setLoading(true);
      setError(null);

      const response = await timeManagementService.deleteBreakPermission(user!.id, permissionId);
      if (response.error) {
        setError(response.error);
      } else {
        setSuccess('Break permission deleted successfully');
        await fetchData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete break permission';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/portal/my-attendance" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Attendance
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Break Permissions</h1>
          <p className="text-gray-600">Request and manage break time permissions</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {/* Permission Limit Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Maximum break duration:</strong> {maxLimit} minutes ({Math.floor(maxLimit / 60)} hours {maxLimit % 60} minutes)
          </p>
        </div>

        {/* New Request Button */}
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              disabled={loading}
            >
              Request Break Permission
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">New Break Permission Request</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Duration Display */}
              {formData.startTime && formData.endTime && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Duration:</strong> {calculateDuration(formData.startTime, formData.endTime)} minutes
                  </p>
                </div>
              )}

              {/* Reason */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder="e.g., Lunch break, Medical appointment, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Permissions List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Your Break Permission Requests</h2>
          </div>

          {loading && permissions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Loading break permissions...
            </div>
          ) : permissions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No break permissions found. Request one to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm, index) => (
                    <tr key={perm._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(perm.startTime).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatTime(perm.startTime)} - {formatTime(perm.endTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {perm.duration} min
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {perm.reason}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(perm.status)}`}>
                          {perm.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {perm.status === 'PENDING' && (
                          <button
                            onClick={() => handleDelete(perm._id)}
                            className="text-red-600 hover:text-red-800 font-semibold transition"
                            disabled={loading}
                          >
                            Delete
                          </button>
                        )}
                        {perm.status !== 'PENDING' && (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

