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
      // Don't show error if it's just empty data or 404
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offboarding Management</h1>
          <p className="text-gray-600 mt-1">Manage employee separations, resignations, and exit processes</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/hr-manager/offboarding/termination-reviews"
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Initiate Termination
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button onClick={fetchData} className="ml-4 text-red-800 underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Requests</p>
          <p className="text-2xl font-semibold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Pending Review</p>
          <p className="text-2xl font-semibold mt-1 text-yellow-600">{stats.pending + stats.underReview}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Resignations</p>
          <p className="text-2xl font-semibold mt-1 text-blue-600">{stats.resignations}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Terminations</p>
          <p className="text-2xl font-semibold mt-1 text-orange-600">{stats.terminations}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <h2 className="text-lg font-semibold">Termination & Resignation Requests</h2>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
              >
                <option value="all">All Types</option>
                <option value="resignations">Resignations</option>
                <option value="terminations">Terminations</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
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

        <div className="divide-y divide-gray-200">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No termination or resignation requests found.</p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              // Handle case where employeeId/contractId might be populated objects or strings
              const employeeIdDisplay = typeof request.employeeId === 'object'
                ? (request.employeeId as any)?._id || (request.employeeId as any)?.firstName || 'Unknown'
                : request.employeeId;
              return (
              <Link
                key={request._id}
                href={`/dashboard/hr-manager/offboarding/resignations/${request._id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">
                        Employee: {employeeIdDisplay}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}
                      >
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {getInitiatorLabel(request.initiator)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Reason: {request.reason}</p>
                    {request.terminationDate && (
                      <p className="text-sm text-gray-500">
                        Effective Date: {new Date(request.terminationDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Submitted: {new Date(request.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            );})
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/hr-manager/offboarding/resignations"
          className="bg-white p-5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">Resignation Requests</h3>
          <p className="text-sm text-gray-500 mt-1">
            Review and process employee resignation requests (OFF-018, OFF-019)
          </p>
        </Link>
        <Link
          href="/dashboard/hr-manager/offboarding/termination-reviews"
          className="bg-white p-5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">Termination Reviews</h3>
          <p className="text-sm text-gray-500 mt-1">
            Initiate and manage termination reviews based on performance (OFF-001)
          </p>
        </Link>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900">Exit Clearance</h3>
          <p className="text-sm text-gray-500 mt-1">
            Multi-department sign-off process for approved exits (OFF-006, OFF-010)
          </p>
        </div>
      </div>
    </div>
  );
}

