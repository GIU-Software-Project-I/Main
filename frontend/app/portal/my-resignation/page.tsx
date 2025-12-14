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
    // Try to get contractId from user object, or use employeeId as fallback
    const contractId = (user as any)?.contractId || (user as any)?.employeeContractId || employeeId;

    if (!employeeId) {
      setError('Unable to determine employee information. Please contact HR.');
      return;
    }

    if (!contractId) {
      setError('Unable to find your contract information. Please contact HR to ensure your contract is on file.');
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

  const getStatusConfig = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: 'clock',
          label: 'Pending Review'
        };
      case TerminationStatus.UNDER_REVIEW:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'search',
          label: 'Under Review'
        };
      case TerminationStatus.APPROVED:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: 'check',
          label: 'Approved'
        };
      case TerminationStatus.REJECTED:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'x',
          label: 'Not Approved'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'circle',
          label: status
        };
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
    today.setDate(today.getDate() + 14);
    return today.toISOString().split('T')[0];
  };

  const hasActiveRequest = existingRequests.some(
    (r) => r.status === TerminationStatus.PENDING || r.status === TerminationStatus.UNDER_REVIEW
  );

  const renderStatusIcon = (icon: string) => {
    switch (icon) {
      case 'clock':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'search':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
      case 'check':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'x':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Resignation Request</h1>
          <p className="text-gray-500 mt-1">Submit and track your resignation request</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Requests</h2>
            {existingRequests.map((request) => {
              const statusConfig = getStatusConfig(request.status);
              const reasonDisplay = typeof request.reason === 'object' ? JSON.stringify(request.reason) : request.reason;

              return (
                <div key={request._id} className={`bg-white rounded-xl shadow-sm border ${statusConfig.border} overflow-hidden`}>
                  <div className={`px-6 py-4 ${statusConfig.bg} border-b ${statusConfig.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={statusConfig.text}>
                          {renderStatusIcon(statusConfig.icon)}
                        </div>
                        <div>
                          <span className={`font-semibold ${statusConfig.text}`}>{statusConfig.label}</span>
                          <p className="text-sm text-gray-600 mt-0.5">{getStatusDescription(request.status)}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Reason</p>
                        <p className="text-gray-900 mt-1">{reasonDisplay}</p>
                      </div>
                      {request.terminationDate && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Proposed Last Day</p>
                          <p className="text-gray-900 mt-1">{new Date(request.terminationDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {request.employeeComments && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Your Comments</p>
                        <p className="text-gray-700 mt-1">{request.employeeComments}</p>
                      </div>
                    )}

                    {request.hrComments && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-sm font-medium text-blue-800">HR Response</p>
                        <p className="text-blue-700 mt-1">{request.hrComments}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit New Request */}
        {!hasActiveRequest && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {!showForm ? (
              <div className="p-8 lg:p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Submit a Resignation Request</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  If you wish to resign from your position, you can submit a formal resignation request here.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Start Resignation Request
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Submit Resignation Request</h2>
                  <p className="text-gray-500 mt-1">Please fill out the form below</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-medium text-amber-800">Important Information</h3>
                      <ul className="text-sm text-amber-700 mt-2 space-y-1">
                        <li>Minimum notice period is 2 weeks</li>
                        <li>Your request will follow the approval workflow: Line Manager, Finance, HR</li>
                        <li>You will be notified of decisions through the system</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Resignation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proposed Last Working Day <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.terminationDate}
                      onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                      min={getMinDate()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1.5">Minimum 2 weeks notice period required</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Comments <span className="text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                      value={formData.employeeComments}
                      onChange={(e) => setFormData({ ...formData, employeeComments: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      rows={4}
                      placeholder="Any additional information you would like to share..."
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ reason: '', employeeComments: '', terminationDate: '' });
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Resignation'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {hasActiveRequest && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-amber-800">
              You have an active resignation request pending review. Please wait for it to be processed before submitting a new one.
            </p>
          </div>
        )}

        {/* Offboarding Process */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Offboarding Process</h2>
          <p className="text-gray-500 mb-6">
            A structured approval workflow is followed for all resignation requests.
          </p>

          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            <div className="space-y-6">
              {[
                { step: 1, label: 'Submit Request', description: 'Submit your resignation with reason and effective date', active: true },
                { step: 2, label: 'Manager Review', description: 'Your direct manager reviews and acknowledges' },
                { step: 3, label: 'Financial Clearance', description: 'Finance reviews any outstanding items' },
                { step: 4, label: 'HR Processing', description: 'HR processes and finalizes the request' },
                { step: 5, label: 'Exit Clearance', description: 'Complete checklist: return assets, handover duties' },
                { step: 6, label: 'Final Settlement', description: 'Receive final pay and certificates' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium z-10 ${
                    item.active ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-500'
                  }`}>
                    {item.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className={`font-medium ${item.active ? 'text-gray-900' : 'text-gray-700'}`}>{item.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

