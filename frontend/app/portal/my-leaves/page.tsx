'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { leavesService } from '@/app/services/leaves';

interface LeaveBalance {
  annual: number;
  sick: number;
  personal: number;
  used: {
    annual: number;
    sick: number;
    personal: number;
  };
  pending: {
    annual: number;
    sick: number;
    personal: number;
  };
}

interface LeaveRequest {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export default function MyLeavesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [balanceRes, requestsRes] = await Promise.all([
        leavesService.getBalance(),
        leavesService.getMyRequests(),
      ]);

      if (balanceRes.data) {
        setBalance(balanceRes.data as LeaveBalance);
      }
      if (requestsRes.data) {
        setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      await leavesService.cancelRequest(id);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' };
      case 'APPROVED':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' };
      case 'REJECTED':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' };
      case 'CANCELLED':
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'annual':
        return 'bg-blue-500';
      case 'sick':
        return 'bg-red-500';
      case 'personal':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white rounded-xl shadow-sm"></div>
              ))}
            </div>
            <div className="h-64 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">My Leaves</h1>
            <p className="text-gray-500 mt-1">View your leave balance and manage requests</p>
          </div>
          <Link
            href="/portal/my-leaves/request"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Request Leave
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BalanceCard
            title="Annual Leave"
            total={balance?.annual || 0}
            used={balance?.used?.annual || 0}
            pending={balance?.pending?.annual || 0}
            color="blue"
          />
          <BalanceCard
            title="Sick Leave"
            total={balance?.sick || 0}
            used={balance?.used?.sick || 0}
            pending={balance?.pending?.sick || 0}
            color="red"
          />
          <BalanceCard
            title="Personal Leave"
            total={balance?.personal || 0}
            used={balance?.used?.personal || 0}
            pending={balance?.pending?.personal || 0}
            color="purple"
          />
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="font-semibold text-gray-900">{requests.filter(r => r.status === 'PENDING').length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved (This Year)</p>
                <p className="font-semibold text-gray-900">{requests.filter(r => r.status === 'APPROVED').length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="font-semibold text-gray-900">{requests.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-semibold text-gray-900">Leave Requests</h2>
            <div className="flex gap-2">
              {['all', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === status
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No leave requests found</p>
              <Link
                href="/portal/my-leaves/request"
                className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Submit a Leave Request
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredRequests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                return (
                  <div key={request._id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-1 h-12 rounded-full ${getLeaveTypeColor(request.type)}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900 capitalize">{request.type} Leave</h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </span>
                            <span>{request.days} day{request.days !== 1 ? 's' : ''}</span>
                          </div>
                          {request.reason && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-1">{request.reason}</p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-sm text-red-600 mt-2">Reason: {request.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-auto">
                        {request.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(request._id)}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <Link
                          href={`/portal/my-leaves/request/${request._id}`}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Help Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Leave Policy</h3>
              <p className="text-gray-600 mt-1 text-sm">
                Leave requests require approval from your manager. Medical certificates may be required for sick leave exceeding 1 day.
                For questions about leave policies, please contact HR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BalanceCard({
  title,
  total,
  used,
  pending,
  color,
}: {
  title: string;
  total: number;
  used: number;
  pending: number;
  color: 'blue' | 'red' | 'purple';
}) {
  const available = total - used - pending;
  const percentage = total > 0 ? ((used / total) * 100) : 0;

  const colorClasses = {
    blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
    red: { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-600' },
    purple: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600' },
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className={`w-8 h-8 ${colors.light} rounded-lg flex items-center justify-center`}>
          <svg className={`w-4 h-4 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-3xl font-bold text-gray-900">{available}</span>
        <span className="text-gray-500 ml-1">/ {total} days</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full ${colors.bg}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Used: {used}</span>
        {pending > 0 && <span className="text-amber-600">Pending: {pending}</span>}
      </div>
    </div>
  );
}

