'use client';

import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/app/context/AuthContext';

export default function ResignationPortalPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingRequests, setExistingRequests] = useState<TerminationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    employeeComments: '',
    terminationDate: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchExistingRequests();
    }
  }, [user]);

  const fetchExistingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const employeeId = user?.id;
      if (employeeId) {
        const requests = await offboardingService.getResignationRequestsByEmployeeId(employeeId);
        setExistingRequests(requests);
      }
    } catch (err: any) {
      // No existing requests is fine
      setExistingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason || !formData.terminationDate) {
      setError('Please provide a reason and effective date');
      return;
    }

    const employeeId = user?.id;
    // Note: contractId should be fetched from employee profile or passed differently
    // For now, we'll require it to be provided or show an error
    const contractId = (user as any)?.contractId;

    if (!employeeId) {
      setError('Unable to determine employee information. Please contact HR.');
      return;
    }

    if (!contractId) {
      setError('Contract information not found. Please contact HR to submit a resignation request.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await offboardingService.createResignationRequest({
        employeeId,
        contractId,
        reason: formData.reason,
        employeeComments: formData.employeeComments || undefined,
        terminationDate: formData.terminationDate,
      });
      setFormData({ reason: '', employeeComments: '', terminationDate: '' });
      setShowForm(false);
      await fetchExistingRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to submit resignation request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case TerminationStatus.UNDER_REVIEW:
        return 'bg-blue-100 text-blue-800';
      case TerminationStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case TerminationStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 14); // Minimum 2 weeks notice
    return today.toISOString().split('T')[0];
  };

  const hasActiveRequest = existingRequests.some(
    (r) => r.status === TerminationStatus.PENDING || r.status === TerminationStatus.UNDER_REVIEW
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resignation Request</h1>
          <p className="text-gray-600 mt-1">Submit and track your resignation request (OFF-018, OFF-019)</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Your Resignation Requests</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {existingRequests.map((request) => (
                <div key={request._id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-2">{request.reason}</p>
                      {request.terminationDate && (
                        <p className="text-sm text-gray-500 mt-1">
                          Effective Date: {new Date(request.terminationDate).toLocaleDateString()}
                        </p>
                      )}
                      {request.hrComments && (
                        <div className="mt-2 p-2 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">
                            <strong>HR Response:</strong> {request.hrComments}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Submitted: {new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit New Request */}
        {!hasActiveRequest && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {!showForm ? (
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">Submit a Resignation Request</h2>
                <p className="text-gray-600 mb-4">
                  If you wish to resign from your position, please submit a formal request.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
                >
                  Start Resignation Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold">Submit Resignation Request</h2>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Important Information</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>Minimum notice period: 2 weeks</li>
                    <li>Your request will be reviewed by your line manager and HR</li>
                    <li>You will be notified of the decision via the system</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Resignation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a reason...</option>
                    <option value="Better career opportunity">Better career opportunity</option>
                    <option value="Personal reasons">Personal reasons</option>
                    <option value="Relocation">Relocation</option>
                    <option value="Health reasons">Health reasons</option>
                    <option value="Further education">Further education</option>
                    <option value="Work-life balance">Work-life balance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.terminationDate}
                    onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                    min={getMinDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 2 weeks notice required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Comments
                  </label>
                  <textarea
                    value={formData.employeeComments}
                    onChange={(e) => setFormData({ ...formData, employeeComments: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Any additional information you would like to share..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {hasActiveRequest && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-yellow-800">
              You have an active resignation request. Please wait for it to be processed before submitting a new one.
            </p>
          </div>
        )}

        {/* Workflow Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Offboarding Workflow</h2>
          <p className="text-sm text-gray-600 mb-4">
            Per BR 6: A clearly identified offboarding approval workflow is followed.
          </p>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Employee submits resignation', description: 'You submit your resignation request' },
              { step: 2, label: 'Line Manager review', description: 'Your manager reviews the request' },
              { step: 3, label: 'Financial approval', description: 'Finance department clears any outstanding items' },
              { step: 4, label: 'HR processing', description: 'HR processes and approves the final request' },
              { step: 5, label: 'Exit clearance', description: 'Complete exit checklist and return company assets' },
              { step: 6, label: 'Final settlement', description: 'Receive final pay and benefits settlement' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

