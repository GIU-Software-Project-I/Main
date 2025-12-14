'use client';

import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/app/context/AuthContext';

export default function MyResignationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingRequests, setExistingRequests] = useState<TerminationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
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
        setExistingRequests(Array.isArray(requests) ? requests : []);
      }
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        console.error('Failed to fetch resignation requests:', err);
      }
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
    const contractId = (user as any)?.contractId || 'pending';

    if (!employeeId) {
      setError('Unable to determine employee information. Please contact HR.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await offboardingService.createResignationRequest({
        employeeId,
        contractId,
        reason: formData.reason,
        employeeComments: formData.employeeComments || undefined,
        terminationDate: formData.terminationDate,
      });

      setFormData({ reason: '', employeeComments: '', terminationDate: '' });
      setShowForm(false);
      setSuccess('Your resignation request has been submitted successfully.');
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

  const getStatusDescription = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return 'Your request is waiting for review by your line manager.';
      case TerminationStatus.UNDER_REVIEW:
        return 'Your request is being reviewed by HR and management.';
      case TerminationStatus.APPROVED:
        return 'Your resignation has been approved. HR will contact you about next steps.';
      case TerminationStatus.REJECTED:
        return 'Your request was not approved. Please contact HR for more information.';
      default:
        return '';
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resignation Request</h1>
        <p className="text-gray-600 mt-1">Submit and track your resignation request (OFF-018, OFF-019)</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Existing Requests - Track Status (OFF-019) */}
      {existingRequests.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Your Resignation Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {existingRequests.map((request) => {
              const reasonDisplay = typeof request.reason === 'object' ? JSON.stringify(request.reason) : request.reason;
              return (
                <div key={request._id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(request.status)}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      Submitted: {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{getStatusDescription(request.status)}</p>

                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <p className="text-sm"><strong>Reason:</strong> {reasonDisplay}</p>
                    {request.terminationDate && (
                      <p className="text-sm mt-1">
                        <strong>Effective Date:</strong> {new Date(request.terminationDate).toLocaleDateString()}
                      </p>
                    )}
                    {request.employeeComments && (
                      <p className="text-sm mt-1"><strong>Your Comments:</strong> {request.employeeComments}</p>
                    )}
                  </div>

                  {request.hrComments && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>HR Response:</strong> {request.hrComments}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit New Request (OFF-018) */}
      {!hasActiveRequest && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {!showForm ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">Submit a Resignation Request</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                If you wish to resign from your position, you can submit a formal resignation request here.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                Start Resignation Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-lg font-semibold">Submit Resignation Request (OFF-018)</h2>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Important Information</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>- Minimum notice period: 2 weeks</li>
                  <li>- Your request will follow the approval workflow: Line Manager {'>'} Finance {'>'} HR</li>
                  <li>- You will be notified of decisions through the system</li>
                  <li>- This action cannot be undone once approved</li>
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
                  <option value="Career change">Career change</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proposed Last Working Day <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.terminationDate}
                  onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                  min={getMinDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 2 weeks notice period required (BR 6)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={formData.employeeComments}
                  onChange={(e) => setFormData({ ...formData, employeeComments: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Any additional information you would like to share..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Resignation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ reason: '', employeeComments: '', terminationDate: '' });
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
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
            You have an active resignation request pending review. Please wait for it to be processed before submitting a new one.
          </p>
        </div>
      )}

      {/* Offboarding Workflow Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Offboarding Process (BR 6)</h2>
        <p className="text-sm text-gray-600 mb-4">
          A clearly identified approval workflow is followed for all resignation requests.
        </p>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          <div className="space-y-6">
            {[
              { step: 1, label: 'Submit Request', description: 'You submit your resignation with reason and effective date', icon: '📝' },
              { step: 2, label: 'Line Manager Review', description: 'Your direct manager reviews and acknowledges', icon: '👤' },
              { step: 3, label: 'Financial Clearance', description: 'Finance reviews any outstanding items', icon: '💰' },
              { step: 4, label: 'HR Processing', description: 'HR processes and finalizes the request', icon: '✅' },
              { step: 5, label: 'Exit Clearance', description: 'Complete checklist: return assets, handover duties', icon: '📋' },
              { step: 6, label: 'Final Settlement', description: 'Receive final pay, benefits, and certificates', icon: '🎯' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-sm z-10">
                  {item.step}
                </div>
                <div className="flex-1 pb-2">
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
