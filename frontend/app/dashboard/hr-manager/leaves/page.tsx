'use client';

import { useState, useEffect, useCallback } from 'react';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/app/context/AuthContext';
import type { LeaveBalanceSummary } from '@/app/types/leaves';

interface LeaveRequest {
  _id: string;
  employeeId: string;
  leaveTypeId: string;
  dates: {
    from: string | Date;
    to: string | Date;
  };
  durationDays: number;
  justification?: string;
  status: string;
  approvalFlow?: Array<{
    role: string;
    status: string;
    decidedBy?: string;
    decidedAt?: string;
  }>;
  employeeName?: string;
  leaveTypeName?: string;
  createdAt?: string;
}

interface LeaveType {
  _id?: string;
  id?: string;
  name: string;
  code: string;
}

interface AccrualResult {
  ok: boolean;
  message?: string;
  processed: number;
  created?: number;
  totalEntitlements?: number;
  referenceDate: string;
  method: string;
  roundingRule: string;
}

export default function HRManagerLeavesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'entitlements' | 'adjustments' | 'accruals'>('requests');

  // Requests state
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Entitlements state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeBalances, setEmployeeBalances] = useState<LeaveBalanceSummary[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    yearlyEntitlement: 0,
  });
  
  // Adjustment state
  const [adjustmentForm, setAdjustmentForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    type: 'add' as 'add' | 'deduct',
    days: 0,
    reason: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  // Accrual state
  const [accrualForm, setAccrualForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    method: 'monthly' as 'monthly' | 'yearly' | 'per-term',
    roundingRule: 'round' as 'none' | 'round' | 'round_up' | 'round_down',
  });
  const [carryForwardForm, setCarryForwardForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    capDays: 45,
    expiryMonths: 12,
  });
  const [accrualRunning, setAccrualRunning] = useState(false);
  const [lastAccrualResult, setLastAccrualResult] = useState<AccrualResult | null>(null);
  const [recalcEmployeeId, setRecalcEmployeeId] = useState('');

  const fetchLeaveTypes = async () => {
    try {
      const response = await leavesService.getLeaveTypes();
      if (Array.isArray(response.data)) {
        setLeaveTypes(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
    }
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leavesService.getAllRequests({
        page: currentPage,
        limit: 20,
        status: filterStatus === 'all' ? undefined : filterStatus,
      });

      if (response.data) {
        const data = response.data as { data?: LeaveRequest[]; meta?: { total: number; page: number; pages: number } };
        setRequests(Array.isArray(data.data) ? data.data : []);
        if (data.meta) {
          setTotalPages(data.meta.pages || 1);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leave requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus]);

  useEffect(() => {
    if (!user) return;
    fetchLeaveTypes();
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [user, activeTab, fetchRequests]);

  const fetchEmployeeBalances = async (employeeId: string) => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const response = await leavesService.getBalance(employeeId);
      if (Array.isArray(response.data)) {
        // Enrich with leave type names
        const enriched = response.data.map((bal: LeaveBalanceSummary & { yearlyEntitlement?: number }) => {
          const leaveType = leaveTypes.find((lt) => 
            (lt._id && lt._id === bal.leaveTypeId) || (lt.id && lt.id === bal.leaveTypeId)
          );
          return {
            ...bal,
            leaveTypeName: leaveType?.name || bal.leaveTypeName || '',
            leaveTypeCode: leaveType?.code || bal.leaveTypeCode || '',
            entitled: bal.yearlyEntitlement ?? bal.entitled ?? 0,
          };
        });
        setEmployeeBalances(enriched);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employee balances';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleManagerApprove = async (id: string) => {
    if (!user) return;
    if (!confirm('Approve this leave request?')) return;

    try {
      await leavesService.managerApprove(id, user.id);
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve request';
      setError(message);
    }
  };

  const handleManagerReject = async (id: string) => {
    if (!user) return;
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await leavesService.managerReject(id, user.id, reason);
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject request';
      setError(message);
    }
  };

  const handleHRFinalize = async (id: string, decision: 'approve' | 'reject') => {
    if (!user) return;
    if (decision === 'approve' && !confirm('Final approval - approve this leave request?')) return;
    if (decision === 'reject') {
      const reason = prompt('Please provide a reason for rejection:');
      if (!reason) return;
    }

    try {
      await leavesService.hrFinalize(id, user.id, decision);
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${decision} request`;
      setError(message);
    }
  };

  const handleAssignEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.employeeId || !assignForm.leaveTypeId || assignForm.yearlyEntitlement <= 0) {
      setError('Please fill all fields with valid values');
      return;
    }

    try {
      setLoading(true);
      await leavesService.assignEntitlement({
        employeeId: assignForm.employeeId,
        leaveTypeId: assignForm.leaveTypeId,
        yearlyEntitlement: assignForm.yearlyEntitlement,
      });
      setError(null);
      setAssignForm({ employeeId: '', leaveTypeId: '', yearlyEntitlement: 0 });
      if (assignForm.employeeId === selectedEmployeeId) {
        await fetchEmployeeBalances(selectedEmployeeId);
      }
      alert('Entitlement assigned successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign entitlement';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentForm.employeeId || !adjustmentForm.leaveTypeId || adjustmentForm.days <= 0 || !adjustmentForm.reason) {
      setError('Please fill all fields with valid values');
      return;
    }

    try {
      setLoading(true);
      await leavesService.createAdjustment({
        employeeId: adjustmentForm.employeeId,
        leaveTypeId: adjustmentForm.leaveTypeId,
        type: adjustmentForm.type,
        days: adjustmentForm.days,
        reason: adjustmentForm.reason,
        effectiveDate: adjustmentForm.effectiveDate,
      });
      setError(null);
      setAdjustmentForm({
        employeeId: '',
        leaveTypeId: '',
        type: 'add',
        days: 0,
        reason: '',
        effectiveDate: new Date().toISOString().split('T')[0],
      });
      if (adjustmentForm.employeeId === selectedEmployeeId) {
        await fetchEmployeeBalances(selectedEmployeeId);
      }
      setSuccessMessage('Balance adjustment created successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create adjustment';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Run accrual for all employees
  const handleRunAccrual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('This will run accrual calculation for all employees. Continue?')) return;

    try {
      setAccrualRunning(true);
      setError(null);
      const response = await leavesService.runAccrual({
        referenceDate: accrualForm.referenceDate,
        method: accrualForm.method,
        roundingRule: accrualForm.roundingRule,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      const result = response.data as AccrualResult;
      setLastAccrualResult(result);

      if (result.ok) {
        const created = result.created || 0;
        const processed = result.processed || 0;
        setSuccessMessage(
          `Accrual completed! Created ${created} new entitlements, processed ${processed} accruals.`
        );
      } else {
        setError(result.message || 'Accrual failed');
      }
      setTimeout(() => setSuccessMessage(null), 8000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run accrual';
      setError(message);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Run carry forward for all employees
  const handleCarryForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('This will process carry-forward for all employees. Continue?')) return;

    try {
      setAccrualRunning(true);
      setError(null);
      const response = await leavesService.carryForward({
        referenceDate: carryForwardForm.referenceDate,
        capDays: carryForwardForm.capDays,
        expiryMonths: carryForwardForm.expiryMonths,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccessMessage('Carry-forward completed successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run carry-forward';
      setError(message);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Recalculate single employee's balances
  const handleRecalcEmployee = async () => {
    if (!recalcEmployeeId.trim()) {
      setError('Please enter an employee ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await leavesService.recalcEmployee(recalcEmployeeId);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccessMessage(`Employee ${recalcEmployeeId} balances recalculated successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setRecalcEmployeeId('');

      // If we were viewing this employee's balances, refresh them
      if (recalcEmployeeId === selectedEmployeeId) {
        await fetchEmployeeBalances(selectedEmployeeId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to recalculate employee balances';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize default entitlements for an employee (for personal leave fix)
  const handleInitializeEntitlements = async (employeeId: string) => {
    if (!employeeId.trim()) {
      setError('Please enter an employee ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Calling getBalance will trigger the backend to auto-create entitlements if they don't exist
      const response = await leavesService.getBalance(employeeId);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccessMessage(`Entitlements initialized for employee ${employeeId}!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh the displayed balances
      if (employeeId === selectedEmployeeId) {
        setEmployeeBalances(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize entitlements';
      setError(message);
    } finally {
      setLoading(false);
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

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 mt-1">Manage leave requests, entitlements, and balances</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['requests', 'entitlements', 'adjustments', 'accruals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'requests' ? 'Leave Requests' :
                 tab === 'entitlements' ? 'Assign Entitlements' :
                 tab === 'adjustments' ? 'Balance Adjustments' :
                 'Auto Accruals'}
              </button>
            ))}
          </nav>
        </div>

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setCurrentPage(1);
                    }}
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

            {/* Requests List */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-gray-500">No leave requests found</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {requests.map((request) => {
                    const statusConfig = getStatusConfig(request.status);
                    const managerApproved = request.approvalFlow?.find((f) => f.role === 'manager')?.status === 'approved';
                    const hrApproved = request.approvalFlow?.find((f) => f.role === 'hr')?.status === 'approved';
                    
                    return (
                      <div key={request._id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-medium text-gray-900">
                                {request.employeeName || 'Employee'} - {request.leaveTypeName || 'Leave'}
                              </h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{formatDate(request.dates?.from)} - {formatDate(request.dates?.to)}</span>
                              <span>{request.durationDays} day{request.durationDays !== 1 ? 's' : ''}</span>
                            </div>
                            {request.justification && (
                              <p className="text-sm text-gray-600 mt-2">{request.justification}</p>
                            )}
                            <div className="flex gap-2 mt-2 text-xs text-gray-500">
                              {request.approvalFlow?.map((flow, idx) => (
                                <span key={idx}>
                                  {flow.role}: {flow.status}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:ml-auto">
                            {request.status === 'PENDING' && !managerApproved && (
                              <>
                                <button
                                  onClick={() => handleManagerApprove(request._id)}
                                  className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                  Approve (Manager)
                                </button>
                                <button
                                  onClick={() => handleManagerReject(request._id)}
                                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  Reject (Manager)
                                </button>
                              </>
                            )}
                            {request.status === 'PENDING' && managerApproved && !hrApproved && (
                              <>
                                <button
                                  onClick={() => handleHRFinalize(request._id, 'approve')}
                                  className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                  Final Approve (HR)
                                </button>
                                <button
                                  onClick={() => handleHRFinalize(request._id, 'reject')}
                                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  Final Reject (HR)
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Entitlements Tab */}
        {activeTab === 'entitlements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assign Entitlement Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Leave Entitlement</h2>
                <form onSubmit={handleAssignEntitlement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                    <input
                      type="text"
                      value={assignForm.employeeId}
                      onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter employee ID"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                    <select
                      value={assignForm.leaveTypeId}
                      onChange={(e) => setAssignForm({ ...assignForm, leaveTypeId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes.map((type) => (
                        <option key={type._id || type.id} value={type._id || type.id}>
                          {type.name} ({type.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yearly Entitlement (Days)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={assignForm.yearlyEntitlement}
                      onChange={(e) => setAssignForm({ ...assignForm, yearlyEntitlement: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 20"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Assigning...' : 'Assign Entitlement'}
                  </button>
                </form>
              </div>

              {/* View Employee Balances */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">View Employee Balances</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter employee ID"
                      />
                      <button
                        onClick={() => fetchEmployeeBalances(selectedEmployeeId)}
                        disabled={!selectedEmployeeId || loading}
                        className="px-4 py-2.5 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        View
                      </button>
                    </div>
                  </div>
                  
                  {employeeBalances.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700">Leave Balances:</h3>
                      {employeeBalances.map((balance) => (
                        <div key={balance.leaveTypeId} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">{balance.leaveTypeName}</span>
                            <span className="text-sm text-gray-600">
                              {balance.remaining} / {balance.entitled} days
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Used: {balance.taken} | Pending: {balance.pending}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Adjustments Tab */}
        {activeTab === 'adjustments' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Balance Adjustment</h2>
            <form onSubmit={handleCreateAdjustment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={adjustmentForm.employeeId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, employeeId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter employee ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <select
                    value={adjustmentForm.leaveTypeId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, leaveTypeId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type._id || type.id} value={type._id || type.id}>
                        {type.name} ({type.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
                  <select
                    value={adjustmentForm.type}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as 'add' | 'deduct' })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="add">Add Days</option>
                    <option value="deduct">Deduct Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={adjustmentForm.days}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, days: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
                  <input
                    type="date"
                    value={adjustmentForm.effectiveDate}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, effectiveDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Provide a reason for this adjustment"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Adjustment...' : 'Create Adjustment'}
              </button>
            </form>
          </div>
        )}

        {/* Accruals Tab */}
        {activeTab === 'accruals' && (
          <div className="space-y-6">
            {/* Accrual Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Automatic Leave Accrual</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Run accrual calculations to automatically add leave days to employee balances according to company policy.
                    This ensures entitlements stay accurate without manual calculation.
                  </p>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• <strong>Monthly:</strong> Adds 1/12 of yearly entitlement each month</li>
                    <li>• <strong>Yearly:</strong> Adds full yearly entitlement at once</li>
                    <li>• <strong>Per-Term:</strong> Adds 1/3 of yearly entitlement (for academic/quarterly systems)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Run Accrual Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Leave Accrual</h2>
                <form onSubmit={handleRunAccrual} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference Date</label>
                    <input
                      type="date"
                      value={accrualForm.referenceDate}
                      onChange={(e) => setAccrualForm({ ...accrualForm, referenceDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Date to calculate accrual from</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accrual Method</label>
                    <select
                      value={accrualForm.method}
                      onChange={(e) => setAccrualForm({ ...accrualForm, method: e.target.value as 'monthly' | 'yearly' | 'per-term' })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Monthly (1/12 yearly)</option>
                      <option value="yearly">Yearly (full entitlement)</option>
                      <option value="per-term">Per-Term (1/3 yearly)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rounding Rule</label>
                    <select
                      value={accrualForm.roundingRule}
                      onChange={(e) => setAccrualForm({ ...accrualForm, roundingRule: e.target.value as 'none' | 'round' | 'round_up' | 'round_down' })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="round">Round to nearest</option>
                      <option value="round_up">Round up</option>
                      <option value="round_down">Round down</option>
                      <option value="none">No rounding (keep decimals)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={accrualRunning}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {accrualRunning ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Running Accrual...
                      </>
                    ) : (
                      'Run Accrual for All Employees'
                    )}
                  </button>
                </form>

                {lastAccrualResult && (
                  <div className={`mt-4 p-3 rounded-lg ${lastAccrualResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm font-medium ${lastAccrualResult.ok ? 'text-green-800' : 'text-red-800'}`}>
                      Last Accrual Result:
                    </p>
                    {lastAccrualResult.ok ? (
                      <ul className="text-sm text-green-700 mt-1 space-y-0.5">
                        {lastAccrualResult.created !== undefined && lastAccrualResult.created > 0 && (
                          <li>• Created: {lastAccrualResult.created} new entitlements</li>
                        )}
                        <li>• Processed: {lastAccrualResult.processed} accruals</li>
                        {lastAccrualResult.totalEntitlements !== undefined && (
                          <li>• Total entitlements: {lastAccrualResult.totalEntitlements}</li>
                        )}
                        <li>• Method: {lastAccrualResult.method}</li>
                        <li>• Date: {new Date(lastAccrualResult.referenceDate).toLocaleDateString()}</li>
                      </ul>
                    ) : (
                      <p className="text-sm text-red-700 mt-1">{lastAccrualResult.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Carry Forward Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Carry Forward Leave</h2>
                <form onSubmit={handleCarryForward} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference Date</label>
                    <input
                      type="date"
                      value={carryForwardForm.referenceDate}
                      onChange={(e) => setCarryForwardForm({ ...carryForwardForm, referenceDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Usually end of leave year</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Days to Carry Forward</label>
                    <input
                      type="number"
                      min="0"
                      value={carryForwardForm.capDays}
                      onChange={(e) => setCarryForwardForm({ ...carryForwardForm, capDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry (Months)</label>
                    <input
                      type="number"
                      min="1"
                      value={carryForwardForm.expiryMonths}
                      onChange={(e) => setCarryForwardForm({ ...carryForwardForm, expiryMonths: parseInt(e.target.value) || 12 })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Carried-forward days expire after this period</p>
                  </div>
                  <button
                    type="submit"
                    disabled={accrualRunning}
                    className="w-full px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {accrualRunning ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Process Carry Forward'
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Individual Employee Recalculation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Individual Employee Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recalculate Employee */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recalculate Employee Balances</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Recalculates taken/pending from actual leave requests to fix any discrepancies.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={recalcEmployeeId}
                      onChange={(e) => setRecalcEmployeeId(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter employee ID"
                    />
                    <button
                      onClick={handleRecalcEmployee}
                      disabled={loading || !recalcEmployeeId.trim()}
                      className="px-4 py-2.5 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Recalculate
                    </button>
                  </div>
                </div>

                {/* Initialize Entitlements */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Initialize Default Entitlements</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Creates default entitlements (Annual: 21, Sick: 14, Personal: 5 days) for employees without any.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter employee ID"
                    />
                    <button
                      onClick={() => handleInitializeEntitlements(selectedEmployeeId)}
                      disabled={loading || !selectedEmployeeId.trim()}
                      className="px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Initialize
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Leave Fix Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Personal Leave Balance Fix</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    If employees show 0 days for Personal Leave, use the &quot;Initialize Default Entitlements&quot; feature above
                    with their Employee ID. This will automatically create entitlements for all leave types including
                    5 days of Personal Leave.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

