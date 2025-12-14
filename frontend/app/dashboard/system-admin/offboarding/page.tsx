'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { offboardingService, TerminationRequest, TerminationStatus, ClearanceChecklist } from '@/app/services/offboarding';

export default function SystemAdminOffboardingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get approved termination requests that need access revocation
      const result = await offboardingService.getAllTerminationRequests();
      const approvedRequests = Array.isArray(result)
        ? result.filter(r => r.status === TerminationStatus.APPROVED)
        : [];
      setRequests(approvedRequests);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (request: TerminationRequest) => {
    const employeeId = typeof request.employeeId === 'object'
      ? (request.employeeId as any)?._id
      : request.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    try {
      setProcessing(request._id);
      setError(null);
      setSuccess(null);

      await offboardingService.revokeSystemAccess({
        employeeId,
      });

      setSuccess(`System access revoked for employee ${employeeId}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setProcessing(null);
    }
  };

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
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Revocation</h1>
          <p className="text-gray-600 mt-1">Revoke system access for terminated employees (OFF-007)</p>
        </div>
        <Link
          href="/dashboard/system-admin/onboarding"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Access Provisioning
        </Link>
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

      {/* Business Rules */}
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h3 className="font-medium text-red-900">Security Requirements</h3>
        <ul className="mt-2 text-sm text-red-800 space-y-1">
          <li><strong>OFF-007:</strong> Revoke system and account access upon termination to maintain security</li>
          <li><strong>BR 3(c), BR 19:</strong> Access revocation is mandatory for security compliance</li>
          <li>Access must be revoked immediately upon approval of termination</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Pending Access Revocation</p>
          <p className="text-2xl font-semibold mt-1 text-red-600">{requests.length}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Access Types to Revoke</p>
          <p className="text-sm mt-1 text-gray-600">Email, SSO, Internal Systems, Payroll</p>
        </div>
      </div>

      {/* Pending Revocations */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Approved Terminations - Pending Access Revocation</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No pending access revocations.</p>
              <p className="text-sm mt-1">All approved terminations have had their access revoked.</p>
            </div>
          ) : (
            requests.map((request) => {
              const employeeIdDisplay = typeof request.employeeId === 'object'
                ? (request.employeeId as any)?._id || (request.employeeId as any)?.firstName || 'Unknown'
                : request.employeeId;
              const reasonDisplay = typeof request.reason === 'object'
                ? JSON.stringify(request.reason)
                : request.reason;

              return (
                <div key={request._id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">Employee: {employeeIdDisplay}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Access Active
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Reason: {reasonDisplay}</p>
                      {request.terminationDate && (
                        <p className="text-sm text-gray-500">
                          Termination Date: {new Date(request.terminationDate).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Approved: {new Date(request.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(request)}
                      disabled={processing === request._id}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {processing === request._id ? 'Revoking...' : 'Revoke All Access'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Access Types to Revoke */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Access Types Revoked</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Email</h3>
            <p className="text-xs text-red-600 mt-1">Disabled</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">SSO</h3>
            <p className="text-xs text-red-600 mt-1">Disabled</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Internal Systems</h3>
            <p className="text-xs text-red-600 mt-1">Disabled</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Payroll</h3>
            <p className="text-xs text-red-600 mt-1">Disabled</p>
          </div>
        </div>
      </div>
    </div>
  );
}

