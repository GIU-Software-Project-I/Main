'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
} from '@/app/services/offboarding';
import { StatusBadge } from '@/app/components/ui/status-badge';

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

  // Helper to normalize status/initiator for case-insensitive comparison
  const normalizeValue = (val: string) => val?.toLowerCase?.() || val;

  const filteredRequests = requests.filter((request) => {
    const requestStatus = normalizeValue(request.status);
    const requestInitiator = normalizeValue(request.initiator);

    if (filterStatus !== 'all' && requestStatus !== normalizeValue(filterStatus)) return false;
    if (filterType === 'resignations' && requestInitiator !== normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    if (filterType === 'terminations' && requestInitiator === normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.PENDING)).length,
    underReview: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.UNDER_REVIEW)).length,
    approved: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.APPROVED)).length,
    resignations: requests.filter((r) => normalizeValue(r.initiator) === normalizeValue(TerminationInitiation.EMPLOYEE)).length,
    terminations: requests.filter((r) => normalizeValue(r.initiator) !== normalizeValue(TerminationInitiation.EMPLOYEE)).length,
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
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-card rounded-xl shadow-sm"></div>
              ))}
            </div>
            <div className="h-96 bg-card rounded-xl shadow-sm"></div>
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
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Offboarding Management</h1>
            <p className="text-muted-foreground mt-1">Manage employee separations, resignations, and exit processes</p>
          </div>
          <Link
            href="/dashboard/hr-manager/offboarding/termination-reviews"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Initiate Termination
          </Link>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
            <button onClick={fetchData} className="text-destructive hover:text-destructive/80 font-medium">
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending + stats.underReview}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resignations</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.resignations}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Terminations</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.terminations}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground">Termination & Resignation Requests</h2>
              <div className="flex gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="all">All Types</option>
                  <option value="resignations">Resignations</option>
                  <option value="terminations">Terminations</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
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

          <div className="divide-y divide-border">
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-muted-foreground font-medium">No requests found</p>
                <p className="text-muted-foreground/80 text-sm mt-1">Termination and resignation requests will appear here</p>
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
                    className="block px-6 py-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isResignation ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-orange-100 dark:bg-orange-900/20'
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
                            <h3 className="font-medium text-foreground">
                              {employeeName}
                            </h3>
                            <StatusBadge status={request.status} />
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {getInitiatorLabel(request.initiator)}
                            </span>
                            <span className="text-sm text-muted-foreground/80">
                              {request.reason.length > 50 ? `${request.reason.slice(0, 50)}...` : request.reason}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        {request.terminationDate && (
                          <p className="text-xs text-muted-foreground/70 mt-1">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/hr-manager/offboarding/resignations"
            className="group bg-card p-5 rounded-xl shadow-sm border border-border hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">Resignations</h3>
                <p className="text-xs text-muted-foreground mt-1">Review employee resignations</p>
              </div>
            </div>
          </Link>
          <Link
            href="/dashboard/hr-manager/offboarding/termination-reviews"
            className="group bg-card p-5 rounded-xl shadow-sm border border-border hover:border-orange-200 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm group-hover:text-orange-600 transition-colors">Terminations</h3>
                <p className="text-xs text-muted-foreground mt-1">Initiate termination reviews</p>
              </div>
            </div>
          </Link>
          <Link
            href="/dashboard/hr-manager/offboarding/checklist"
            className="group bg-card p-5 rounded-xl shadow-sm border border-border hover:border-green-200 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm group-hover:text-green-600 transition-colors">Exit Clearance</h3>
                <p className="text-xs text-muted-foreground mt-1">Department sign-offs</p>
              </div>
            </div>
          </Link>
          <Link
            href="/dashboard/hr-manager/offboarding/final-settlement"
            className="group bg-card p-5 rounded-xl shadow-sm border border-border hover:border-purple-200 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm group-hover:text-purple-600 transition-colors">Final Settlement</h3>
                <p className="text-xs text-muted-foreground mt-1">Process final pay</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
