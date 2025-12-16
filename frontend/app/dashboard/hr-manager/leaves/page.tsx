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

export default function HRManagerLeavesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'entitlements' | 'adjustments'>('requests');
  
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
      alert('Balance adjustment created successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create adjustment';
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['requests', 'entitlements', 'adjustments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'requests' ? 'Leave Requests' : tab === 'entitlements' ? 'Assign Entitlements' : 'Balance Adjustments'}
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
      </div>
    </div>
  );
}

