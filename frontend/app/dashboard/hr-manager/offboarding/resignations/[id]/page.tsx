'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
  ClearanceChecklist,
} from '@/app/services/offboarding';
import { useAuth } from '@/app/context/AuthContext';

export default function ResignationDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<TerminationRequest | null>(null);
  const [clearance, setClearance] = useState<ClearanceChecklist | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (requestId) {
      fetchData();
    }
  }, [requestId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const requestData = await offboardingService.getTerminationRequestById(requestId);
      setRequest(requestData);

      if (requestData.status === TerminationStatus.APPROVED) {
        try {
          const clearanceData = await offboardingService.getClearanceChecklistByTerminationId(requestId);
          setClearance(clearanceData);
        } catch {
          // Clearance may not exist yet
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch request data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: TerminationStatus, comments?: string) => {
    if (!request) return;

    try {
      setUpdating(true);
      setError(null);
      await offboardingService.updateTerminationStatus(requestId, {
        status: newStatus,
        hrComments: comments,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateClearance = async () => {
    if (!request) return;

    try {
      setUpdating(true);
      setError(null);
      await offboardingService.createClearanceChecklist({
        terminationId: requestId,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create clearance checklist');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      setUpdating(true);
      await offboardingService.deleteTerminationRequest(requestId);
      router.push('/dashboard/hr-manager/offboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to delete request');
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TerminationStatus.UNDER_REVIEW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TerminationStatus.APPROVED:
        return 'bg-green-100 text-green-800 border-green-200';
      case TerminationStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          Request not found
        </div>
        <Link href="/dashboard/hr-manager/offboarding" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Offboarding Dashboard
        </Link>
      </div>
    );
  }

  const isResignation = request.initiator === TerminationInitiation.EMPLOYEE;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-gray-500 hover:text-gray-700">
              Offboarding
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{isResignation ? 'Resignation' : 'Termination'} Request</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {isResignation ? 'Resignation' : 'Termination'} Request Details
          </h1>
          <p className="text-gray-600 mt-1">Employee ID: {request.employeeId}</p>
        </div>
        <div className="flex gap-3">
          {request.status === TerminationStatus.PENDING && (
            <button
              onClick={handleDelete}
              disabled={updating}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              Delete Request
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Request Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadge(request.status)}`}>
                    {request.status.replace('_', ' ').toUpperCase()}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-gray-900">
                  {isResignation ? 'Employee Resignation' : `${request.initiator.toUpperCase()} Initiated Termination`}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted Date</dt>
                <dd className="mt-1 text-gray-900">{new Date(request.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Effective Date</dt>
                <dd className="mt-1 text-gray-900">
                  {request.terminationDate ? new Date(request.terminationDate).toLocaleDateString() : 'Not specified'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Reason</dt>
                <dd className="mt-1 text-gray-900">{request.reason}</dd>
              </div>
              {request.employeeComments && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Employee Comments</dt>
                  <dd className="mt-1 text-gray-900">{request.employeeComments}</dd>
                </div>
              )}
              {request.hrComments && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">HR Comments</dt>
                  <dd className="mt-1 text-gray-900">{request.hrComments}</dd>
                </div>
              )}
            </dl>
          </div>

          {request.performanceWarnings && request.performanceWarnings.length > 0 && (
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
              <h2 className="text-lg font-semibold text-orange-900 mb-4">Performance Warnings</h2>
              <ul className="space-y-2">
                {request.performanceWarnings.map((warning, index) => (
                  <li key={index} className="text-orange-800">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {request.status === TerminationStatus.APPROVED && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Exit Clearance</h2>
              {clearance ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Clearance checklist has been created. Track department sign-offs below.
                  </p>
                  <Link
                    href={`/dashboard/hr-manager/offboarding/exit-clearance/${clearance._id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    View Clearance Checklist
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Create a clearance checklist to track department sign-offs for this employee.
                  </p>
                  <button
                    onClick={handleCreateClearance}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Creating...' : 'Create Clearance Checklist'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {request.status === TerminationStatus.PENDING && (
                <>
                  <button
                    onClick={() => handleStatusUpdate(TerminationStatus.UNDER_REVIEW)}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Start Review
                  </button>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter rejection reason:');
                      if (comments) handleStatusUpdate(TerminationStatus.REJECTED, comments);
                    }}
                    disabled={updating}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject Request
                  </button>
                </>
              )}
              {request.status === TerminationStatus.UNDER_REVIEW && (
                <>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter approval comments (optional):');
                      handleStatusUpdate(TerminationStatus.APPROVED, comments || undefined);
                    }}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve Request
                  </button>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter rejection reason:');
                      if (comments) handleStatusUpdate(TerminationStatus.REJECTED, comments);
                    }}
                    disabled={updating}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject Request
                  </button>
                </>
              )}
              {request.status === TerminationStatus.APPROVED && clearance && (
                <Link
                  href={`/dashboard/hr-manager/offboarding/final-settlement/${request._id}`}
                  className="block w-full px-4 py-2 bg-gray-900 text-white text-center rounded-md hover:bg-gray-800"
                >
                  Process Final Settlement
                </Link>
              )}
              {(request.status === TerminationStatus.APPROVED || request.status === TerminationStatus.REJECTED) && (
                <p className="text-sm text-gray-500 text-center">
                  This request has been {request.status.toLowerCase()}.
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Workflow Status</h2>
            <div className="space-y-3">
              {[
                { step: 1, label: 'Request Submitted', completed: true },
                { step: 2, label: 'Under Review', completed: request.status !== TerminationStatus.PENDING },
                { step: 3, label: 'Approved/Rejected', completed: request.status === TerminationStatus.APPROVED || request.status === TerminationStatus.REJECTED },
                { step: 4, label: 'Clearance Process', completed: !!clearance },
                { step: 5, label: 'Final Settlement', completed: false },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      item.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {item.completed ? '✓' : item.step}
                  </div>
                  <span className={item.completed ? 'text-gray-900' : 'text-gray-500'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

