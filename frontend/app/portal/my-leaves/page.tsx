'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { leavesService } from '@/app/services/leaves';
import { notificationsService, type Notification } from '@/app/services/notifications';
import { useAuth } from '@/app/context/AuthContext';
import type { LeaveBalanceSummary } from '@/app/types/leaves';

type LeaveBalance = LeaveBalanceSummary[];

interface LeaveRequest {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'RETURNED_FOR_CORRECTION';
  createdAt: string;
  approvedBy?: string;
  rejectionReason?: string;
}

// Backend leave request structure
interface BackendLeaveRequest {
  _id: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  dates: {
    from: string | Date;
    to: string | Date;
  };
  durationDays: number;
  justification?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function MyLeavesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<LeaveBalance>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [thirdLeaveTypeName, setThirdLeaveTypeName] = useState<string>('Personal');

  // Filter and sort state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('-dates.from'); // Default: newest first
  const [leaveTypes, setLeaveTypes] = useState<Array<{ _id: string; name: string; code?: string }>>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchData(user.id);

    // Auto-refresh every 30 seconds to get latest status updates
    const interval = setInterval(() => {
      fetchData(user.id, true); // silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Refetch when filters or sort changes
  useEffect(() => {
    if (!user) return;
    fetchRequests(user.id);
  }, [user, filterStatus, filterLeaveType, filterDateFrom, filterDateTo, sortBy]);

  const manualRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    await fetchData(user.id);
    setIsRefreshing(false);
  };

  const dismissNotification = (notificationId: string) => {
    setDismissedNotifications((prev) => new Set([...prev, notificationId]));
  };

  const visibleNotifications = notifications.filter(
    (n) => !dismissedNotifications.has(n._id)
  );

  // Fetch only leave requests with current filters
  const fetchRequests = async (employeeId: string) => {
    try {
      const params: {
        status?: string;
        leaveTypeId?: string;
        from?: string;
        to?: string;
        sort?: string;
        limit?: number;
      } = {
        sort: sortBy,
        limit: 100,
      };

      // Only add filter params if they're not 'all'
      if (filterStatus !== 'all') {
        params.status = filterStatus.toLowerCase();
      }
      if (filterLeaveType !== 'all') {
        params.leaveTypeId = filterLeaveType;
      }
      if (filterDateFrom) {
        params.from = filterDateFrom;
      }
      if (filterDateTo) {
        params.to = filterDateTo;
      }

      const requestsRes = await leavesService.getMyRequests(employeeId, params);

      // Transform backend leave requests to frontend format
      let backendRequests: BackendLeaveRequest[] = [];
      let total = 0;

      if (requestsRes.data) {
        const resData = requestsRes.data as { data?: BackendLeaveRequest[]; total?: number };
        if (Array.isArray(resData.data)) {
          backendRequests = resData.data;
          total = resData.total ?? resData.data.length;
        } else if (Array.isArray(requestsRes.data)) {
          backendRequests = requestsRes.data as BackendLeaveRequest[];
          total = backendRequests.length;
        }
      }

      // Map backend structure to frontend structure
      const mappedRequests: LeaveRequest[] = backendRequests.map((req) => {
        const formatDate = (date: string | Date | undefined): string => {
          if (!date) return '';
          if (typeof date === 'string') {
            const d = new Date(date);
            return isNaN(d.getTime()) ? date : d.toISOString().split('T')[0];
          }
          return date.toISOString().split('T')[0];
        };

        // Find leave type name from leaveTypes
        const leaveType = leaveTypes.find(lt => lt._id === req.leaveTypeId);
        const normalizedStatus = (req.status || 'pending').toUpperCase() as LeaveRequest['status'];

        return {
          _id: req._id,
          type: leaveType?.name || req.leaveTypeName || 'Unknown',
          startDate: formatDate(req.dates?.from),
          endDate: formatDate(req.dates?.to),
          days: req.durationDays || 0,
          reason: req.justification || '',
          status: normalizedStatus,
          createdAt: req.createdAt || new Date().toISOString(),
        };
      });

      setRequests(mappedRequests);
      setTotalRequests(total);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const fetchData = async (employeeId: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [balanceRes, leaveTypesRes, notificationsRes] = await Promise.all([
        leavesService.getBalance(employeeId),
        leavesService.getLeaveTypes(),
        notificationsService.getLeaveNotifications(employeeId),
      ]);

      console.log('Notifications response:', notificationsRes);
      console.log('Balance response:', balanceRes);

      // Set notifications
      if (Array.isArray(notificationsRes.data)) {
        setNotifications(notificationsRes.data);
      }

      // Get leave types to enrich balance data and for filtering
      interface BackendLeaveType {
        _id?: string;
        id?: string;
        name?: string;
        code?: string;
      }
      
      const fetchedLeaveTypes: BackendLeaveType[] = Array.isArray(leaveTypesRes.data) ? leaveTypesRes.data : [];

      // Store leave types for filter dropdown
      setLeaveTypes(fetchedLeaveTypes.map(lt => ({
        _id: lt._id || lt.id || '',
        name: lt.name || '',
        code: lt.code,
      })));

      // Detect the third leave type name (personal, paternity, maternity, etc.)
      let foundThirdType = 'Personal';
      for (const lt of fetchedLeaveTypes) {
        const name = (lt.name || '').toLowerCase();
        const code = (lt.code || '').toLowerCase();

        // Skip annual and sick
        if (name.includes('annual') || code.includes('annual')) continue;
        if (name.includes('sick') || code.includes('sick')) continue;

        // Use the first matching type
        if (name.includes('personal') || code.includes('personal')) {
          foundThirdType = 'Personal';
          break;
        } else if (name.includes('paternity') || code.includes('paternity')) {
          foundThirdType = 'Paternity';
          break;
        } else if (name.includes('maternity') || code.includes('maternity')) {
          foundThirdType = 'Maternity';
          break;
        } else if (name.includes('compassionate') || code.includes('compassionate')) {
          foundThirdType = 'Compassionate';
          break;
        } else if (name.includes('unpaid') || code.includes('unpaid')) {
          foundThirdType = 'Unpaid';
          break;
        } else if (lt.name) {
          // Use the first non-annual/non-sick type found
          foundThirdType = lt.name.replace(' Leave', '');
          break;
        }
      }
      setThirdLeaveTypeName(foundThirdType);

      // Backend balance response structure
      interface BackendBalance {
        leaveTypeId: string;
        yearlyEntitlement?: number;
        entitled?: number;
        accrued?: number;
        taken?: number;
        pending?: number;
        remaining?: number;
        carryForward?: number;
        leaveTypeName?: string;
        leaveTypeCode?: string;
      }
      
      // Enrich balance data with leave type names and codes
      let enrichedBalances: LeaveBalanceSummary[] = [];
      if (Array.isArray(balanceRes.data)) {
        console.log('Raw balance data from backend:', balanceRes.data);

        enrichedBalances = (balanceRes.data as BackendBalance[]).map((bal) => {
          const leaveType = fetchedLeaveTypes.find((lt) =>
            (lt._id && lt._id === bal.leaveTypeId) || (lt.id && lt.id === bal.leaveTypeId)
          );

          const entitled = bal.yearlyEntitlement ?? bal.entitled ?? 0;
          const taken = bal.taken ?? 0;
          const pending = bal.pending ?? 0;
          const carryForward = bal.carryForward ?? 0;
          // Use backend's remaining value directly
          const remaining = bal.remaining ?? 0;

          console.log(`Balance for ${leaveType?.name || bal.leaveTypeName}:`, {
            entitled,
            taken,
            pending,
            carryForward,
            remaining,
          });

          return {
            leaveTypeId: bal.leaveTypeId,
            leaveTypeName: leaveType?.name || bal.leaveTypeName || '',
            leaveTypeCode: leaveType?.code || bal.leaveTypeCode || '',
            entitled,
            accrued: bal.accrued ?? entitled,
            taken,
            pending,
            remaining,
            carryForward,
          };
        });
      }

      // If no balances exist, create default entries for common leave types
      if (enrichedBalances.length === 0 && fetchedLeaveTypes.length > 0) {
        const commonTypes = ['annual', 'sick', 'personal'];
        commonTypes.forEach((typeName) => {
          const type = fetchedLeaveTypes.find((lt) =>
            lt.name?.toLowerCase().includes(typeName) || lt.code?.toLowerCase().includes(typeName)
          );
          if (type) {
            enrichedBalances.push({
              leaveTypeId: type._id || type.id || '',
              leaveTypeName: type.name || '',
              leaveTypeCode: type.code || '',
              entitled: 0,
              accrued: 0,
              taken: 0,
              pending: 0,
              remaining: 0,
              carryForward: 0,
            });
          }
        });
      }

      setBalance(enrichedBalances);
      
      // Fetch requests with current filters
      await fetchRequests(employeeId);

      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leave data';
      setError(message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    if (!user) {
      setError('You must be logged in to cancel a leave request.');
      return;
    }

    try {
      await leavesService.cancelRequest(id, user.id);
      await fetchData(user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel request';
      setError(message);
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
      case 'RETURNED_FOR_CORRECTION':
      case 'returned_for_correction':
        return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Needs Correction' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };

  const getLeaveTypeColor = (type: string | undefined) => {
    if (!type) return 'bg-gray-500';
    switch (type.toLowerCase()) {
      case 'annual':
      case 'annual leave':
        return 'bg-blue-500';
      case 'sick':
      case 'sick leave':
        return 'bg-red-500';
      case 'personal':
      case 'personal leave':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };


  const getBalanceSummary = (kind: 'annual' | 'sick' | 'personal') => {
    const match = balance.find((item) => {
      const name = (item.leaveTypeName || '').toLowerCase();
      const code = (item.leaveTypeCode || '').toLowerCase();

      if (kind === 'annual') {
        return name.includes('annual') || code.includes('annual');
      }
      if (kind === 'sick') {
        return name.includes('sick') || code.includes('sick');
      }
      if (kind === 'personal') {
        // Check for personal, paternity, maternity, compassionate, or other third types
        return name.includes('personal') || code.includes('personal') ||
               name.includes('paternity') || code.includes('paternity') ||
               name.includes('maternity') || code.includes('maternity') ||
               name.includes('compassionate') || code.includes('compassionate') ||
               name.includes('unpaid') || code.includes('unpaid');
      }
      return false;
    });

    // If no match found, return default values so cards still show
    if (!match) {
      return {
        entitled: 0,
        taken: 0,
        pending: 0,
        remaining: 0,
        carryForward: 0,
      };
    }

    return {
      entitled: match.entitled ?? 0,
      taken: match.taken ?? 0,
      pending: match.pending ?? 0,
      remaining: match.remaining ?? 0,
      carryForward: match.carryForward ?? 0,
    };
  };

  if (!user || loading) {
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
            <p className="text-gray-500 mt-1">
              View your leave balance and manage requests
              {lastUpdated && (
                <span className="ml-2 text-xs text-gray-400">
                  • Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={manualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
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
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Leave Notifications */}
        {visibleNotifications.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Recent Updates
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{visibleNotifications.length} notification{visibleNotifications.length !== 1 ? 's' : ''}</span>
                {visibleNotifications.length > 0 && (
                  <button
                    onClick={() => setDismissedNotifications(new Set(notifications.map(n => n._id)))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Dismiss all
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {visibleNotifications.slice(0, 10).map((notification) => {
                const style = notificationsService.getNotificationStyle(notification);
                const parsed = notificationsService.parseLeaveNotification(notification);

                return (
                  <div
                    key={notification._id}
                    className={`p-3 rounded-lg border ${style.bgColor} ${style.borderColor} relative group`}
                  >
                    <button
                      onClick={() => dismissNotification(notification._id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{style.icon}</span>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className={`text-sm font-medium ${style.textColor}`}>
                          {parsed.action === 'approved' && '🎉 Leave Approved!'}
                          {parsed.action === 'rejected' && '❌ Leave Rejected'}
                          {parsed.action === 'submitted' && '📝 Request Submitted'}
                          {parsed.action === 'cancelled' && '🚫 Leave Cancelled'}
                          {parsed.action === 'modified' && '✏️ Needs Correction'}
                          {parsed.action === 'balance_adjusted' && '⚖️ Balance Updated'}
                          {parsed.action === 'other' && 'ℹ️ Update'}
                        </p>
                        <p className={`text-sm ${style.textColor} mt-1`}>{notification.message}</p>
                        {notification.createdAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Balance Cards - original 3-card layout using real balances */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(() => {
            const annual = getBalanceSummary('annual');
            const sick = getBalanceSummary('sick');
            const personal = getBalanceSummary('personal');

            return (
              <>
                <BalanceCard
                  title="Annual Leave"
                  entitled={annual.entitled}
                  taken={annual.taken}
                  pending={annual.pending}
                  remaining={annual.remaining}
                  carryForward={annual.carryForward}
                  color="blue"
                />
                <BalanceCard
                  title="Sick Leave"
                  entitled={sick.entitled}
                  taken={sick.taken}
                  pending={sick.pending}
                  remaining={sick.remaining}
                  carryForward={sick.carryForward}
                  color="red"
                />
                <BalanceCard
                  title={`${thirdLeaveTypeName} Leave`}
                  entitled={personal.entitled}
                  taken={personal.taken}
                  pending={personal.pending}
                  remaining={personal.remaining}
                  carryForward={personal.carryForward}
                  color="purple"
                />
              </>
            );
          })()}
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
                <p className="text-sm text-gray-500">Approved</p>
                <p className="font-semibold text-green-600">{requests.filter(r => r.status === 'APPROVED').length}</p>
              </div>
            </div>
            {requests.filter(r => r.status === 'REJECTED').length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rejected</p>
                  <p className="font-semibold text-red-600">{requests.filter(r => r.status === 'REJECTED').length}</p>
                </div>
              </div>
            )}
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
            {requests.filter(r => r.status === 'RETURNED_FOR_CORRECTION').length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Needs Correction</p>
                  <p className="font-semibold text-orange-600">{requests.filter(r => r.status === 'RETURNED_FOR_CORRECTION').length}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900">Leave Requests</h2>
                <span className="text-sm text-gray-500">({totalRequests} total)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                  {(filterLeaveType !== 'all' || filterDateFrom || filterDateTo) && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2 mt-4">
              {['all', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED_FOR_CORRECTION'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === status
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'RETURNED_FOR_CORRECTION' ? 'Needs Correction' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Leave Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                    <select
                      value={filterLeaveType}
                      onChange={(e) => setFilterLeaveType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Types</option>
                      {leaveTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date From Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Date To Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="-dates.from">Date (Newest First)</option>
                      <option value="dates.from">Date (Oldest First)</option>
                      <option value="-createdAt">Submitted (Newest First)</option>
                      <option value="createdAt">Submitted (Oldest First)</option>
                      <option value="-durationDays">Duration (Longest First)</option>
                      <option value="durationDays">Duration (Shortest First)</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setFilterLeaveType('all');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                      setSortBy('-dates.from');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {filterStatus !== 'all' || filterLeaveType !== 'all' || filterDateFrom || filterDateTo
                  ? 'No leave requests match your filters'
                  : 'No leave requests found'}
              </p>
              {filterStatus === 'all' && filterLeaveType === 'all' && !filterDateFrom && !filterDateTo && (
                <Link
                  href="/portal/my-leaves/request"
                  className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Submit a Leave Request
                </Link>
              )}
              {(filterStatus !== 'all' || filterLeaveType !== 'all' || filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterLeaveType('all');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                return (
                  <div key={request._id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-1 h-12 rounded-full ${getLeaveTypeColor(request.type)}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900 capitalize">{request.type || 'Unknown'} Leave</h3>
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
                        {request.status === 'RETURNED_FOR_CORRECTION' && (
                          <Link
                            href={`/portal/my-leaves/request/${request._id}/edit`}
                            className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            Resubmit
                          </Link>
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
  entitled,
  taken,
  pending,
  remaining,
  carryForward = 0,
  color,
}: {
  title: string;
  entitled: number;
  taken: number;
  pending: number;
  remaining: number;
  carryForward?: number;
  color: 'blue' | 'red' | 'purple';
}) {
  // Total available = yearly entitlement + carryForward
  const totalEntitled = entitled + carryForward;
  const available = remaining;
  const percentage = totalEntitled > 0 ? ((taken / totalEntitled) * 100) : 0;

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
        <span className="text-gray-500 ml-1">/ {totalEntitled} days</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full ${colors.bg}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Used: {taken}</span>
        {pending > 0 && <span className="text-amber-600">Pending: {pending}</span>}
      </div>
    </div>
  );
}

