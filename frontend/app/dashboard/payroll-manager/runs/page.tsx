'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { payrollExecutionService } from '@/app/services/payroll-execution';

// Helper function to format payrollPeriod object to string
const formatPayrollPeriod = (period: any): string => {
  if (!period) return 'No Period';
  if (typeof period === 'string') {
    // Try to parse as date
    const d = new Date(period);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    return period;
  }
  if (typeof period === 'object') {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = period.month !== undefined ? monthNames[period.month] || `Month ${period.month}` : '';
    const year = period.year || '';
    if (month && year) return `${month} ${year}`;
    if (period.startDate && period.endDate) {
      return `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`;
    }
    return 'No Period';
  }
  return String(period);
};

interface PayrollRun {
  _id: string;
  runId?: string;
  payrollPeriod?: string;
  entity?: string;
  status?: string;
  employees?: number;
  exceptions?: number;
  totalnetpay?: number;
  totalGrossPay?: number;
  totalDeductions?: number;
  totalAllowances?: number;
  totalBaseSalary?: number;
  totalOvertime?: number;
  totalPenalties?: number;
  totalTaxDeductions?: number;
  totalInsuranceDeductions?: number;
  irregularitiesCount?: number;
  irregularities?: string[];
  createdAt?: string;
  processedAt?: string;
  paymentStatus?: string;
  approvedByManager?: boolean;
  approvedByManagerAt?: string;
  approvedByFinance?: boolean;
  approvedByFinanceAt?: string;
  frozen?: boolean;
  frozenAt?: string;
  frozenReason?: string;
  unfreezeReason?: string;
  employeePayrollDetails?: any[];
  managerApprovalDate?: string;
  financeApprovalDate?: string;
  payrollManagerId?: string;
  financeStaffId?: string;
}

interface EmployeePayrollDetail {
  _id?: string;
  employeeId?: string;
  employeeName?: string;
  basePay?: number;
  grossPay?: number;
  netPay?: number;
  taxDeductions?: number;
  insuranceDeductions?: number;
  otherDeductions?: number;
  allowances?: number;
  overtime?: number;
  penalties?: number;
  refunds?: number;
  signingBonus?: number;
  terminationBenefit?: number;
  status?: string;
  exceptions?: string[];
}

export default function PayrollManagerRunsPage() {
  const searchParams = useSearchParams();
  const filterFromUrl = searchParams.get('filter');
  
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeePayrollDetail[]>([]);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Map URL filter to tab
  const getInitialTab = (): 'pending' | 'all' | 'frozen' | 'approved' => {
    if (filterFromUrl === 'pending') return 'pending';
    if (filterFromUrl === 'frozen') return 'frozen';
    if (filterFromUrl === 'approved') return 'approved' as any;
    return 'all';
  };
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'frozen'>(getInitialTab() as 'pending' | 'all' | 'frozen');

  // Sync tab with URL changes
  useEffect(() => {
    if (filterFromUrl) {
      if (filterFromUrl === 'pending') setActiveTab('pending');
      else if (filterFromUrl === 'frozen') setActiveTab('frozen');
      else setActiveTab('all');
    }
  }, [filterFromUrl]);

  useEffect(() => {
    fetchRuns();
  }, [statusFilter, activeTab]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchRuns = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page: 1, limit: 100 };
      if (statusFilter) params.status = statusFilter;
      
      const res = await payrollExecutionService.listRuns(params);
      
      if (res?.error) {
        setError(res.error || 'Failed to connect to server. Please ensure the backend is running on http://localhost:9000');
        setRuns([]);
        return;
      }
      
      const data = (res?.data || res) as any;
      let items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      // Filter based on active tab
      if (activeTab === 'pending') {
        // Show runs awaiting manager approval:
        // - Status 'under review' or 'under_review' means processed and awaiting manager approval (REQ-PY-20, REQ-PY-22)
        // - Must NOT have managerApprovalDate set (manager hasn't approved yet)
        items = items.filter((r: PayrollRun) => {
          const status = (r.status || '').toLowerCase();
          return (status === 'under review' || status === 'under_review') && !r.managerApprovalDate;
        });
      } else if (activeTab === 'frozen') {
        items = items.filter((r: PayrollRun) => {
          const status = (r.status || '').toLowerCase();
          return r.frozen || status === 'locked' || status === 'frozen';
        });
      }
      
      setRuns(items);
    } catch (e: any) {
      console.error('Failed to load runs:', e);
      setError(e?.message || 'Failed to load runs. Please check if the backend is running.');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await payrollExecutionService.getDraft(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const details = (res?.data || res) as any;
      setRunDetails(details);
      // Extract employee payroll details if available
      if (details?.employeePayrollDetails) {
        setEmployeeDetails(details.employeePayrollDetails);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this payroll run? This indicates your review is complete and the run can proceed to finance approval.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.approveByManager(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll run approved by manager! It will now proceed to finance for final approval.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async (id: string) => {
    const reason = prompt('Enter reason for freezing this payroll:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.freeze(id, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll run has been frozen. No further changes can be made until unfrozen.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to freeze');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfreeze = async (id: string) => {
    const reason = prompt('Enter reason for unfreezing this payroll:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.unfreeze(id, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll run has been unfrozen. Changes can now be made.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to unfreeze');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'draft') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s === 'pending' || s === 'pending finance approval') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'locked' || s === 'frozen') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s === 'unlocked') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (s === 'paid') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s === 'under review' || s === 'under_review') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'EGP 0';
    return `EGP ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-EG', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-black mb-2">Payroll Manager - Review & Approval</h1>
        <p className="text-gray-600 mb-6">
          Review payroll runs, approve, and manage freeze/unfreeze operations
        </p>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            ⏳ Pending Approval
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            📋 All Runs
          </button>
          <button
            onClick={() => setActiveTab('frozen')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'frozen'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            🔒 Frozen
          </button>
          <button
            onClick={fetchRuns}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Filter for All tab */}
        {activeTab === 'all' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-black">Filter by Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-black bg-white"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="under review">Under Review</option>
                <option value="pending finance approval">Pending Finance Approval</option>
                <option value="approved">Approved</option>
                <option value="locked">Locked</option>
                <option value="unlocked">Unlocked</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}

        {/* Runs List */}
        {loading && runs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Loading payroll runs...</div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-500">
              {activeTab === 'pending' 
                ? 'No payroll runs awaiting your approval' 
                : activeTab === 'frozen'
                ? 'No frozen payroll runs'
                : 'No payroll runs found'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {runs.map((run) => (
              <div
                key={run._id}
                className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  run.frozen ? 'border-blue-300' : 'border-gray-200'
                }`}
                onClick={() => {
                  setSelectedRun(run);
                  fetchRunDetails(run._id);
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-semibold text-black text-lg">
                      {formatPayrollPeriod(run.payrollPeriod)}
                    </span>
                    <p className="text-sm text-gray-500">{run.entity || 'Default Entity'}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(run.status || '')}`}>
                      {run.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                    {run.frozen && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        🔒 FROZEN
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">Employees:</span>
                    <span className="ml-1 text-black font-medium">{run.employees || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Exceptions:</span>
                    <span className={`ml-1 font-medium ${(run.exceptions || 0) > 0 ? 'text-red-600' : 'text-black'}`}>
                      {run.exceptions || 0}
                    </span>
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <span className="text-gray-500 text-sm">Total Net Pay:</span>
                  <p className="text-xl font-bold text-black">{formatCurrency(run.totalnetpay)}</p>
                </div>

                {/* Approval Status Indicators */}
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${run.approvedByManager ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {run.approvedByManager ? '✓ Mgr' : '○ Mgr'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${run.approvedByFinance ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {run.approvedByFinance ? '✓ Fin' : '○ Fin'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Run Modal */}
        {selectedRun && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-black">
                      Payroll Run Review
                    </h2>
                    <p className="text-gray-500">
                      {formatPayrollPeriod(selectedRun.payrollPeriod)}
                      {' - '}{selectedRun.entity || 'Default Entity'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedRun(null); setRunDetails(null); setEmployeeDetails([]); }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(selectedRun.status || '')}`}>
                    {selectedRun.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                  {selectedRun.frozen && (
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      🔒 FROZEN
                    </span>
                  )}
                  {selectedRun.approvedByManager && (
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      ✓ Manager Approved
                    </span>
                  )}
                  {selectedRun.approvedByFinance && (
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      ✓ Finance Approved
                    </span>
                  )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-gray-500 text-sm">Employees</span>
                    <p className="text-2xl font-bold text-black">{selectedRun.employees || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-gray-500 text-sm">Exceptions</span>
                    <p className={`text-2xl font-bold ${(selectedRun.exceptions || 0) > 0 ? 'text-red-600' : 'text-black'}`}>
                      {selectedRun.exceptions || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-gray-500 text-sm">Total Gross Pay</span>
                    <p className="text-xl font-bold text-black">{formatCurrency(selectedRun.totalGrossPay || runDetails?.totalGrossPay)}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <span className="text-gray-500 text-sm">Total Deductions</span>
                    <p className="text-xl font-bold text-red-600">-{formatCurrency(selectedRun.totalDeductions || runDetails?.totalDeductions)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <span className="text-gray-500 text-sm">Total Net Pay</span>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedRun.totalnetpay)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <span className="text-gray-500 text-sm">Irregularities</span>
                    <p className={`text-2xl font-bold ${(selectedRun.irregularitiesCount || 0) > 0 ? 'text-orange-600' : 'text-black'}`}>
                      {selectedRun.irregularitiesCount || 0}
                    </p>
                  </div>
                </div>

                {/* Irregularities Section */}
                {(selectedRun.irregularities && selectedRun.irregularities.length > 0) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-800 mb-2">⚠️ Flagged Irregularities</h3>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedRun.irregularities.map((irr, idx) => (
                        <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>{irr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Freeze/Unfreeze Info */}
                {selectedRun.frozen && selectedRun.frozenReason && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-1">🔒 Frozen</h3>
                    <p className="text-sm text-blue-700">Reason: {selectedRun.frozenReason}</p>
                    {selectedRun.frozenAt && (
                      <p className="text-xs text-blue-600 mt-1">Frozen at: {formatDate(selectedRun.frozenAt)}</p>
                    )}
                  </div>
                )}

                {/* Approval Timeline */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-black mb-3">Approval Workflow</h3>
                  <div className="flex gap-4">
                    <div className={`flex-1 p-4 rounded-lg border-2 ${
                      selectedRun.approvedByManager 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-orange-50 border-orange-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{selectedRun.approvedByManager ? '✅' : '⏳'}</span>
                        <span className="font-medium text-black">Manager Approval</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedRun.approvedByManager 
                          ? `Approved ${selectedRun.approvedByManagerAt ? formatDate(selectedRun.approvedByManagerAt) : ''}` 
                          : 'Awaiting approval'}
                      </p>
                    </div>
                    <div className="flex items-center text-gray-400">→</div>
                    <div className={`flex-1 p-4 rounded-lg border-2 ${
                      selectedRun.approvedByFinance 
                        ? 'bg-green-50 border-green-300' 
                        : selectedRun.approvedByManager 
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">
                          {selectedRun.approvedByFinance ? '✅' : selectedRun.approvedByManager ? '⏳' : '⏸️'}
                        </span>
                        <span className="font-medium text-black">Finance Approval</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedRun.approvedByFinance 
                          ? `Approved ${selectedRun.approvedByFinanceAt ? formatDate(selectedRun.approvedByFinanceAt) : ''}`
                          : selectedRun.approvedByManager
                            ? 'Awaiting finance'
                            : 'Pending manager approval'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employee Payroll Details */}
                {employeeDetails.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-black mb-3">Employee Payroll Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-2 text-black">Employee</th>
                            <th className="text-right p-2 text-black">Gross</th>
                            <th className="text-right p-2 text-black">Deductions</th>
                            <th className="text-right p-2 text-black">Net</th>
                            <th className="text-center p-2 text-black">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeDetails.slice(0, 10).map((emp, idx) => (
                            <tr key={emp._id || idx} className="border-b border-gray-100">
                              <td className="p-2 text-black">
                                {emp.employeeName || emp.employeeId?.toString().slice(-8) || '-'}
                                {emp.exceptions && emp.exceptions.length > 0 && (
                                  <span className="ml-2 text-xs text-red-600" title={emp.exceptions.join(', ')}>⚠️</span>
                                )}
                              </td>
                              <td className="text-right p-2 text-black">{formatCurrency(emp.grossPay)}</td>
                              <td className="text-right p-2 text-red-600">
                                -{formatCurrency((emp.taxDeductions || 0) + (emp.insuranceDeductions || 0) + (emp.otherDeductions || 0))}
                              </td>
                              <td className="text-right p-2 text-green-700 font-medium">{formatCurrency(emp.netPay)}</td>
                              <td className="text-center p-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(emp.status || '')}`}>
                                  {emp.status || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {employeeDetails.length > 10 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Showing 10 of {employeeDetails.length} employees
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Run Details - Always show comprehensive info */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-black mb-2">Run Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {/* Run ID */}
                      {(runDetails?.runId || selectedRun.runId) && (
                        <>
                          <span className="text-gray-600">Run ID:</span>
                          <span className="font-medium text-black">{runDetails?.runId || selectedRun.runId}</span>
                        </>
                      )}
                      
                      {/* Period */}
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium text-black">
                        {formatPayrollPeriod(runDetails?.payrollPeriod || selectedRun.payrollPeriod)}
                      </span>
                      
                      {/* Entity/Department */}
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-black">{runDetails?.entity || selectedRun.entity || '-'}</span>
                      
                      {/* Employees */}
                      <span className="text-gray-600">Employees:</span>
                      <span className="font-medium text-black">{runDetails?.employees || runDetails?.totalEmployees || selectedRun.employees || 0}</span>
                      
                      {/* Status */}
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-black capitalize">{selectedRun.status || '-'}</span>
                      
                      {/* Payment Status */}
                      {(runDetails?.paymentStatus || selectedRun.paymentStatus) && (
                        <>
                          <span className="text-gray-600">Payment Status:</span>
                          <span className="font-medium text-black capitalize">{runDetails?.paymentStatus || selectedRun.paymentStatus}</span>
                        </>
                      )}
                      
                      {/* Base Salary Total */}
                      {(runDetails?.totalBaseSalary !== undefined) && (
                        <>
                          <span className="text-gray-600">Base Salaries:</span>
                          <span className="font-medium text-black">EGP {runDetails?.totalBaseSalary?.toLocaleString() || '0'}</span>
                        </>
                      )}
                      
                      {/* Allowances */}
                      {(runDetails?.totalAllowances !== undefined) && (
                        <>
                          <span className="text-gray-600">Total Allowances:</span>
                          <span className="font-medium text-green-700">+EGP {runDetails?.totalAllowances?.toLocaleString() || '0'}</span>
                        </>
                      )}
                      
                      {/* Overtime */}
                      {(runDetails?.totalOvertime !== undefined && runDetails?.totalOvertime > 0) && (
                        <>
                          <span className="text-gray-600">Overtime:</span>
                          <span className="font-medium text-blue-700">+EGP {runDetails?.totalOvertime?.toLocaleString() || '0'}</span>
                        </>
                      )}
                      
                      {/* Penalties */}
                      {(runDetails?.totalPenalties !== undefined && runDetails?.totalPenalties > 0) && (
                        <>
                          <span className="text-gray-600">Penalties:</span>
                          <span className="font-medium text-red-600">-EGP {runDetails?.totalPenalties?.toLocaleString() || '0'}</span>
                        </>
                      )}
                      
                      {/* Created Date */}
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-black">
                        {new Date(runDetails?.createdAt || selectedRun.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      
                      {/* Processed Date */}
                      {(runDetails?.processedAt || selectedRun.processedAt) && (
                        <>
                          <span className="text-gray-600">Processed:</span>
                          <span className="font-medium text-black">
                            {new Date(runDetails?.processedAt || selectedRun.processedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                      
                      {/* Manager Approval Date */}
                      {(runDetails?.managerApprovalDate || selectedRun.managerApprovalDate) && (
                        <>
                          <span className="text-gray-600">Manager Approved:</span>
                          <span className="font-medium text-green-700">
                            {new Date(runDetails?.managerApprovalDate || selectedRun.managerApprovalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                      
                      {/* Finance Approval Date */}
                      {(runDetails?.financeApprovalDate || selectedRun.financeApprovalDate) && (
                        <>
                          <span className="text-gray-600">Finance Approved:</span>
                          <span className="font-medium text-green-700">
                            {new Date(runDetails?.financeApprovalDate || selectedRun.financeApprovalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t pt-4 space-y-3">
                  {/* Manager Approve button - only for 'under review' status (REQ-PY-22) */}
                  {(selectedRun.status === 'under review' || selectedRun.status === 'under_review') && !selectedRun.managerApprovalDate && (
                    <button
                      onClick={() => handleApprove(selectedRun._id)}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓ Approve Payroll Run
                    </button>
                  )}
                  
                  {/* Info for other statuses */}
                  {selectedRun.status === 'draft' && (
                    <div className="text-center text-yellow-600 py-4 bg-yellow-50 rounded-lg">
                      📝 Draft - Awaiting specialist submission
                    </div>
                  )}
                  {(selectedRun.status === 'pending finance approval') && (
                    <div className="text-center text-amber-600 py-4 bg-amber-50 rounded-lg">
                      ✓ Manager approved - Awaiting finance approval
                    </div>
                  )}

                  {/* Freeze/Unfreeze buttons - only show for appropriate statuses */}
                  {(selectedRun.status === 'approved' || selectedRun.status === 'locked' || selectedRun.status === 'unlocked') && (
                    <div className="space-y-3">
                      {selectedRun.status === 'unlocked' && (
                        <div className="text-sm text-purple-700 bg-purple-50 p-3 rounded-lg border border-purple-200">
                          <strong>🔓 Unlocked for Corrections</strong>
                          <p className="mt-1">This run is unlocked. The Payroll Specialist can make edits and resubmit for the full approval cycle (Manager → Finance → Lock).</p>
                          <p className="mt-1 text-xs">You can also directly re-freeze if no changes are needed.</p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        {selectedRun.status === 'approved' || selectedRun.status === 'unlocked' ? (
                          <button
                            onClick={() => handleFreeze(selectedRun._id)}
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            🔒 {selectedRun.status === 'unlocked' ? 'Re-Freeze Payroll' : 'Freeze Payroll'}
                          </button>
                        ) : selectedRun.status === 'locked' ? (
                          <button
                            onClick={() => handleUnfreeze(selectedRun._id)}
                            disabled={loading}
                            className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
                          >
                            🔓 Unfreeze for Corrections
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
