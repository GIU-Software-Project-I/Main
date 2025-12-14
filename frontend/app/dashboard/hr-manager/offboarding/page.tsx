'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
} from '@/app/services/offboarding';

export default function OffboardingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | TerminationStatus>('all');
  const [filterType, setFilterType] = useState<'all' | 'resignations' | 'terminations'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getAllTerminationRequests();
      setRequests(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('Failed to fetch offboarding data:', err);
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setRequests([]);
      } else {
        setError(err.message || 'Failed to fetch offboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (filterStatus !== 'all' && request.status !== filterStatus) return false;
    if (filterType === 'resignations' && request.initiator !== TerminationInitiation.EMPLOYEE) return false;
    if (filterType === 'terminations' && request.initiator === TerminationInitiation.EMPLOYEE) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === TerminationStatus.PENDING).length,
    underReview: requests.filter((r) => r.status === TerminationStatus.UNDER_REVIEW).length,
    approved: requests.filter((r) => r.status === TerminationStatus.APPROVED).length,
    resignations: requests.filter((r) => r.initiator === TerminationInitiation.EMPLOYEE).length,
    terminations: requests.filter((r) => r.initiator !== TerminationInitiation.EMPLOYEE).length,
  };

  const getStatusBadge = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case TerminationStatus.UNDER_REVIEW:
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case TerminationStatus.APPROVED:
        return 'bg-green-100 text-green-800 border border-green-200';
      case TerminationStatus.REJECTED:
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getInitiatorLabel = (initiator: TerminationInitiation) => {
    switch (initiator) {
      case TerminationInitiation.EMPLOYEE:
        return 'Resignation';
      case TerminationInitiation.HR:
        return 'HR Initiated';
      case TerminationInitiation.MANAGER:
        return 'Manager Initiated';
      default:
        return initiator;
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-white rounded-xl shadow-sm"></div>
              ))}
            </div>
            <div className="h-96 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Offboarding Management</h1>
            <p className="text-gray-500 mt-1">Manage employee separations, resignations, and exit processes</p>
          </div>
          <Link
            href="/dashboard/hr-manager/offboarding/termination-reviews"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Initiate Termination
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
            <button onClick={fetchData} className="text-red-800 hover:text-red-900 font-medium">
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending + stats.underReview}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Resignations</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.resignations}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Terminations</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.terminations}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Termination & Resignation Requests</h2>
              <div className="flex gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="resignations">Resignations</option>
                  <option value="terminations">Terminations</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value={TerminationStatus.PENDING}>Pending</option>
                  <option value={TerminationStatus.UNDER_REVIEW}>Under Review</option>
                  <option value={TerminationStatus.APPROVED}>Approved</option>
                  <option value={TerminationStatus.REJECTED}>Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 font-medium">No requests found</p>
                <p className="text-gray-400 text-sm mt-1">Termination and resignation requests will appear here</p>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const employee = typeof request.employeeId === 'object' ? request.employeeId as any : null;
                const employeeName = employee
                  ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
                  : 'Employee';
                const isResignation = request.initiator === TerminationInitiation.EMPLOYEE;
                return (
                  <Link
                    key={request._id}
                    href={`/dashboard/hr-manager/offboarding/resignations/${request._id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isResignation ? 'bg-blue-100' : 'bg-orange-100'
                        }`}>
                          {isResignation ? (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">
                              {employeeName}
                            </h3>
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                              {request.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-500">
                              {getInitiatorLabel(request.initiator)}
                            </span>
                            <span className="text-sm text-gray-400">
                              {request.reason.length > 50 ? `${request.reason.slice(0, 50)}...` : request.reason}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        {request.terminationDate && (
                          <p className="text-xs text-gray-400 mt-1">
                            Effective: {new Date(request.terminationDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/hr-manager/offboarding/resignations"
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Resignation Requests</h3>
                <p className="text-sm text-gray-500 mt-1">Review and process employee resignation requests</p>
              </div>
            </div>
          </Link>
          <Link
            href="/dashboard/hr-manager/offboarding/termination-reviews"
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Termination Reviews</h3>
                <p className="text-sm text-gray-500 mt-1">Initiate and manage termination reviews</p>
              </div>
            </div>
          </Link>
          <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Exit Clearance</h3>
                <p className="text-sm text-gray-500 mt-1">Multi-department sign-off for approved exits</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
