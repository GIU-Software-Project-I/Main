'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { payrollExecutionService } from '@/app/services/payroll-execution';

type Tab = 'runs' | 'create' | 'bonuses' | 'termination' | 'payslips' | 'diagnostics';

// Helper function to format payrollPeriod object to string
const formatPayrollPeriod = (period: any): string => {
  if (!period) return 'No Period';
  if (typeof period === 'string') return period;
  if (typeof period === 'object') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = period.month !== undefined ? monthNames[period.month] || `Month ${period.month}` : '';
    const year = period.year || '';
    if (month && year) return `${month} ${year}`;
    if (period.startDate && period.endDate) {
      return `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`;
    }
    // Graceful fallback for unknown period formats
    if (period.name) return period.name;
    if (period.label) return period.label;
    return 'Custom Period';
  }
  return String(period);
};

export default function PayrollSpecialistRunsPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl || 'runs');

  // Sync tab with URL changes
  useEffect(() => {
    if (tabFromUrl && ['runs', 'create', 'bonuses', 'termination', 'payslips', 'diagnostics'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  // Runs
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Departments for dropdown
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Create form
  const [form, setForm] = useState({
    payrollPeriod: '',
    entityId: '',  // department ID
    entity: '',    // department name (auto-filled)
  });
  
  // Bonuses & Termination
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [terminations, setTerminations] = useState<any[]>([]);
  
  // Payslips (REQ-PY-8)
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [payslipsRunId, setPayslipsRunId] = useState<string>('');
  
  // Edit mode (REQ-PY-26)
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    payrollPeriod: '',
    entityId: '',
    entity: '',
  });

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<any>(null);
  
  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRuns();
    fetchDepartments();
  }, [statusFilter]);

  const fetchRuns = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page: 1, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await payrollExecutionService.listRuns(params);
      
      // Check for API error
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = (res?.data || res) as any;
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setRuns(items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await payrollExecutionService.listDepartments();
      if (res?.error) {
        console.error('Failed to load departments:', res.error);
        return;
      }
      const data = res?.data || res;
      setDepartments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load departments:', e?.message);
    }
  };

  const fetchBonuses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.listSigningBonuses();
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = res?.data || res;
      setBonuses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load bonuses');
    } finally {
      setLoading(false);
    }
  };

  const fetchTerminations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.listTerminationBenefits();
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = res?.data || res;
      setTerminations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load termination benefits');
    } finally {
      setLoading(false);
    }
  };

  // REQ-PY-8: Fetch payslips for a payroll run
  const fetchPayslips = async (runId: string) => {
    if (!runId) {
      setError('Please select a payroll run first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.listPayslipsByRun(runId);
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = res?.data || res;
      setPayslips(Array.isArray(data) ? data : []);
      setPayslipsRunId(runId);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  // Fetch diagnostics
  const fetchDiagnostics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.getEmployeeStatusDiagnostics();
      if (res?.error) {
        setError(res.error);
        return;
      }
      const data = res?.data || res;
      setDiagnostics(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.payrollPeriod || !form.entityId) {
      setError('Payroll period and department are required');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await payrollExecutionService.createInitiation({
        payrollPeriod: form.payrollPeriod,
        entity: form.entity,
        entityId: form.entityId,
      });
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      setSuccess('Initiation created successfully!');
      setForm({ payrollPeriod: '', entityId: '', entity: '' });
      fetchRuns();
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.approveInitiation(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Approved successfully!');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.rejectInitiation(id, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Rejected successfully!');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  // REQ-PY-26: Edit payroll initiation (for rejected or draft status)
  const handleStartEdit = (run: any) => {
    setEditForm({
      payrollPeriod: formatPayrollPeriod(run.period || run.payrollPeriod),
      entityId: run.entityId || '',
      entity: run.entity || '',
    });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditForm({ payrollPeriod: '', entityId: '', entity: '' });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.payrollPeriod || !editForm.entityId) {
      setError('Payroll Period and Department are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const updateData: any = {
        payrollPeriod: editForm.payrollPeriod,
        entity: editForm.entity,
        entityId: editForm.entityId,
      };
      
      const res = await payrollExecutionService.updateInitiation(id, updateData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll initiation updated successfully! You can now resubmit.');
      setEditMode(false);
      fetchRuns();
      // Update selected run with new values
      setSelectedRun({ ...selectedRun, ...updateData, status: 'draft' });
    } catch (e: any) {
      setError(e?.message || 'Failed to update');
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-black mb-6">Payroll Execution</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'runs', label: 'Payroll Runs' },
          { key: 'create', label: 'Create Initiation' },
          { key: 'bonuses', label: 'Signing Bonuses' },
          { key: 'termination', label: 'Termination Benefits' },
          { key: 'payslips', label: 'Payslips' },
          { key: 'diagnostics', label: '🔧 Diagnostics' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as Tab);
              setError('');
              setSuccess('');
              if (tab.key === 'bonuses') fetchBonuses();
              if (tab.key === 'termination') fetchTerminations();
              if (tab.key === 'diagnostics') fetchDiagnostics();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-black border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>
      )}

      {/* Tab: Payroll Runs */}
      {activeTab === 'runs' && (
        <div>
          {/* Filter Bar */}
          <div className="flex gap-4 mb-6 items-center">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-black bg-white min-w-[180px]"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="under review">Under Review</option>
                <option value="pending finance approval">Pending Finance Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="locked">Locked</option>
                <option value="unlocked">Unlocked</option>
              </select>
            </div>
            <div className="mt-6">
              <button
                onClick={fetchRuns}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Runs Grid */}
          {loading && runs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Loading payroll runs...</div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No payroll runs found</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runs.map((run) => (
                <div
                  key={run._id}
                  onClick={() => setSelectedRun(run)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer transition hover:shadow-md ${
                    selectedRun?._id === run._id ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-black text-lg">
                      {formatPayrollPeriod(run.period || run.payrollPeriod)}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(run.status)}`}>
                      {run.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entity:</span>
                      <span className="text-black">{run.entity || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employees:</span>
                      <span className="text-black">{run.employees ?? run.employeeCount ?? '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Net Pay:</span>
                      <span className="text-black font-medium">
                        {run.totalnetpay ?? run.totalNetPay ? `$${(run.totalnetpay ?? run.totalNetPay).toLocaleString()}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-black">{run.createdAt ? new Date(run.createdAt).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Run Modal */}
          {selectedRun && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRun(null)}>
              <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-black">Run Details</h2>
                  <button onClick={() => setSelectedRun(null)} className="text-gray-500 hover:text-black text-2xl">&times;</button>
                </div>
                
                <div className="space-y-3 mb-6">
                  {/* Run ID */}
                  {selectedRun.runId && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Run ID:</span>
                      <span className="text-black font-mono text-xs">{selectedRun.runId}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Period:</span>
                    <span className="text-black">{formatPayrollPeriod(selectedRun.period || selectedRun.payrollPeriod)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Department:</span>
                    <span className="text-black">{selectedRun.entity || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(selectedRun.status)}`}>
                      {selectedRun.status || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="text-black capitalize">{selectedRun.paymentStatus || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Employees:</span>
                    <span className="text-black">{selectedRun.employees ?? selectedRun.employeeCount ?? '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Exceptions:</span>
                    <span className={`${(selectedRun.exceptions || 0) > 0 ? 'text-red-600' : 'text-black'}`}>{selectedRun.exceptions ?? 0}</span>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 my-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Financial Summary</h4>
                    {selectedRun.totalBaseSalary !== undefined && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 text-sm">Base Salaries:</span>
                        <span className="text-black">EGP {selectedRun.totalBaseSalary?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    {selectedRun.totalAllowances !== undefined && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 text-sm">Allowances:</span>
                        <span className="text-green-600">+EGP {selectedRun.totalAllowances?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    {selectedRun.totalOvertime !== undefined && selectedRun.totalOvertime > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 text-sm">Overtime:</span>
                        <span className="text-blue-600">+EGP {selectedRun.totalOvertime?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600 text-sm">Gross Pay:</span>
                      <span className="text-black font-semibold">EGP {selectedRun.totalGrossPay?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600 text-sm">Deductions:</span>
                      <span className="text-red-600">-EGP {selectedRun.totalDeductions?.toLocaleString() || '0'}</span>
                    </div>
                    {selectedRun.totalPenalties !== undefined && selectedRun.totalPenalties > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 text-sm">Penalties:</span>
                        <span className="text-red-600">-EGP {selectedRun.totalPenalties?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-1">
                      <span className="text-gray-800 font-medium">Net Pay:</span>
                      <span className="text-green-700 font-bold">EGP {(selectedRun.totalnetpay ?? selectedRun.totalNetPay)?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Irregularities:</span>
                    <span className={`font-semibold ${(selectedRun.irregularitiesCount || 0) > 0 ? 'text-orange-600' : 'text-black'}`}>
                      {selectedRun.irregularitiesCount ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-black">{selectedRun.createdAt ? new Date(selectedRun.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                  </div>
                  {selectedRun.managerApprovalDate && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Manager Approved:</span>
                      <span className="text-green-700">{new Date(selectedRun.managerApprovalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                  {selectedRun.financeApprovalDate && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Finance Approved:</span>
                      <span className="text-green-700">{new Date(selectedRun.financeApprovalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {/* Irregularities Details Section */}
                {(selectedRun.irregularities && selectedRun.irregularities.length > 0) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-800 mb-2">⚠️ Flagged Irregularities</h3>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedRun.irregularities.map((irr: string, idx: number) => (
                        <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>{irr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions for draft status - Specialist submits for review */}
                {selectedRun.status === 'draft' && !editMode && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedRun._id)}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Submit for Review & Process
                      </button>
                      <button
                        onClick={() => handleReject(selectedRun._id)}
                        disabled={loading}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                    <button
                      onClick={() => handleStartEdit(selectedRun)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      ✏️ Edit Payroll
                    </button>
                  </div>
                )}
                
                {/* Info for other statuses */}
                {selectedRun.status === 'pending finance approval' && (
                  <div className="text-center text-amber-600 py-4 bg-amber-50 rounded-lg">
                    ⏳ Awaiting finance approval
                  </div>
                )}
                {selectedRun.status === 'approved' && (
                  <div className="text-center text-green-600 py-4 bg-green-50 rounded-lg">
                    ✅ Approved - Ready to be frozen
                  </div>
                )}
                {(selectedRun.status === 'locked' || selectedRun.status === 'frozen') && (
                  <div className="text-center text-blue-600 py-4 bg-blue-50 rounded-lg">
                    🔒 Payroll is frozen/locked
                  </div>
                )}

                {/* Edit rejected payroll initiation */}
                {selectedRun.status === 'rejected' && !editMode && (
                  <div className="space-y-3">
                    {selectedRun.rejectionReason && (
                      <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        <strong>Rejection Reason:</strong> {selectedRun.rejectionReason}
                      </div>
                    )}
                    <button
                      onClick={() => handleStartEdit(selectedRun)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      ✏️ Edit & Resubmit
                    </button>
                  </div>
                )}

                {/* Edit Form */}
                {(selectedRun.status === 'rejected' || selectedRun.status === 'draft') && editMode && (
                  <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
                    <h3 className="font-semibold text-black">Edit Payroll Initiation</h3>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Payroll Period *</label>
                      <input
                        type="text"
                        placeholder="YYYY-MM"
                        value={editForm.payrollPeriod}
                        onChange={(e) => setEditForm({ ...editForm, payrollPeriod: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Department/Company *</label>
                      <select
                        value={editForm.entityId}
                        onChange={(e) => {
                          const selectedDept = departments.find((d: any) => d._id === e.target.value);
                          setEditForm({ 
                            ...editForm, 
                            entityId: e.target.value,
                            entity: selectedDept?.name || ''
                          });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                      >
                        <option value="">Select a department</option>
                        {departments.map((dept: any) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} ({dept.activeEmployeeCount || 0} active employees)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-xs text-blue-800">
                        Employee count and totals will be recalculated when processed.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSaveEdit(selectedRun._id)}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Create Initiation */}
      {activeTab === 'create' && (
        <div className="max-w-xl">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-black mb-4">Create Payroll Initiation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Payroll Period *</label>
                <input
                  type="text"
                  placeholder="YYYY-MM (e.g., 2025-12)"
                  value={form.payrollPeriod}
                  onChange={(e) => setForm({ ...form, payrollPeriod: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Department/Company *</label>
                <select
                  value={form.entityId}
                  onChange={(e) => {
                    const selectedDept = departments.find((d: any) => d._id === e.target.value);
                    setForm({ 
                      ...form, 
                      entityId: e.target.value,
                      entity: selectedDept?.name || ''
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                >
                  <option value="">Select a department</option>
                  {departments.map((dept: any) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.activeEmployeeCount || 0} active employees)
                    </option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Loading departments...</p>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Employee count and payroll totals will be calculated automatically 
                  when the payroll run is processed. Only active employees in the selected department will be included.
                </p>
              </div>
              <button
                onClick={handleCreate}
                disabled={loading || !form.entityId}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Initiation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Signing Bonuses */}
      {activeTab === 'bonuses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-black">Signing Bonuses</h2>
            <button onClick={fetchBonuses} disabled={loading} className="text-blue-600 hover:text-blue-800">
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : bonuses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No signing bonuses found</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bonuses.map((b) => (
                <div key={b._id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-black truncate" title={b.employeeId}>
                      {b.employeeName || (typeof b.employeeId === 'string' ? b.employeeId.slice(-8) : 'Unknown')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(b.status)}`}>
                      {b.status || '-'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-black mb-2">${(b.givenAmount || b.amount || 0).toLocaleString()}</div>
                  
                  {/* Action buttons for pending bonuses */}
                  {b.status === 'pending' && (
                    <div className="space-y-2">
                      {/* Edit button - REQ-PY-29 */}
                      <button
                        onClick={async () => {
                          const newAmount = prompt('Enter new amount (givenAmount):', String(b.givenAmount || b.amount || 0));
                          if (newAmount === null) return;
                          const amount = parseFloat(newAmount);
                          if (isNaN(amount) || amount < 0) {
                            setError('Invalid amount');
                            return;
                          }
                          try {
                            const res = await payrollExecutionService.editSigningBonus(b._id, { amount });
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            setSuccess('Bonus amount updated!');
                            fetchBonuses();
                          } catch (e: any) {
                            setError(e?.message || 'Failed to edit');
                          }
                        }}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
                      >
                        ✏️ Edit Amount
                      </button>
                      
                      {/* Approve button */}
                      <button
                        onClick={async () => {
                          try {
                            const res = await payrollExecutionService.approveSigningBonus(b._id);
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            setSuccess('Bonus approved!');
                            fetchBonuses();
                          } catch (e: any) {
                            setError(e?.message || 'Failed');
                          }
                        }}
                        className="w-full bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
                      >
                        ✓ Approve
                      </button>
                      
                      {/* Reject button */}
                      <button
                        onClick={async () => {
                          const reason = prompt('Enter rejection reason:');
                          if (!reason) return;
                          try {
                            const res = await payrollExecutionService.rejectSigningBonus(b._id, reason);
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            setSuccess('Bonus rejected!');
                            fetchBonuses();
                          } catch (e: any) {
                            setError(e?.message || 'Failed');
                          }
                        }}
                        className="w-full bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                  
                  {/* Show rejection reason if rejected */}
                  {b.status === 'rejected' && b.rejectionReason && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <strong>Rejection reason:</strong> {b.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Termination Benefits */}
      {activeTab === 'termination' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-black">Termination/Resignation Benefits</h2>
            <button onClick={fetchTerminations} disabled={loading} className="text-blue-600 hover:text-blue-800">
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : terminations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No termination benefits found</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {terminations.map((t) => (
                <div key={t._id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-black truncate" title={t.employeeId}>
                      {t.employeeName || (typeof t.employeeId === 'string' ? t.employeeId.slice(-8) : 'Unknown')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(t.status)}`}>
                      {t.status || '-'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{t.benefitType || t.type || 'Termination/Resignation'}</div>
                  <div className="text-2xl font-bold text-black mb-2">${(t.givenAmount || t.amount || 0).toLocaleString()}</div>
                  
                  {/* Action buttons for pending benefits */}
                  {t.status === 'pending' && (
                    <div className="space-y-2">
                      {/* Edit button */}
                      <button
                        onClick={async () => {
                          const newAmount = prompt('Enter new amount (givenAmount):', String(t.givenAmount || t.amount || 0));
                          if (newAmount === null) return;
                          const amount = parseFloat(newAmount);
                          if (isNaN(amount) || amount < 0) {
                            setError('Invalid amount');
                            return;
                          }
                          try {
                            const res = await payrollExecutionService.editTerminationBenefit(t._id, { amount });
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            setSuccess('Benefit amount updated!');
                            fetchTerminations();
                          } catch (e: any) {
                            setError(e?.message || 'Failed to edit');
                          }
                        }}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
                      >
                        ✏️ Edit Amount
                      </button>
                      
                      {/* Approve button */}
                      <button
                        onClick={async () => {
                          try {
                            const res = await payrollExecutionService.approveTerminationBenefit(t._id);
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            setSuccess('Benefit approved!');
                            fetchTerminations();
                          } catch (e: any) {
                            setError(e?.message || 'Failed');
                          }
                        }}
                        className="w-full bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
                      >
                        ✓ Approve
                      </button>
                      
                      {/* Reject button */}
                      <button
                        onClick={async () => {
                          const reason = prompt('Enter rejection reason:');
                          if (!reason) return;
                          try {
                            const res = await payrollExecutionService.rejectTerminationBenefit(t._id, reason);
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            setSuccess('Benefit rejected!');
                            fetchTerminations();
                          } catch (e: any) {
                            setError(e?.message || 'Failed');
                          }
                        }}
                        className="w-full bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                  
                  {/* Show rejection reason if rejected */}
                  {t.status === 'rejected' && t.rejectionReason && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <strong>Rejection reason:</strong> {t.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Payslips */}
      {activeTab === 'payslips' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-black mb-2">Payslips</h2>
            <p className="text-gray-600 text-sm mb-4">
              View generated payslips for approved/locked payroll runs. Each payslip shows the full breakdown of earnings and deductions.
            </p>
            
            {/* Run selector */}
            <div className="flex gap-4 items-end mb-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Select Payroll Run</label>
                <select
                  value={payslipsRunId}
                  onChange={(e) => {
                    const runId = e.target.value;
                    setPayslipsRunId(runId);
                    if (runId) fetchPayslips(runId);
                    else setPayslips([]);
                  }}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-black bg-white min-w-[300px]"
                >
                  <option value="">-- Select a payroll run --</option>
                  {runs.filter(r => ['approved', 'locked', 'unlocked'].includes(r.status?.toLowerCase())).map((run) => (
                    <option key={run._id} value={run._id}>
                      {formatPayrollPeriod(run.period || run.payrollPeriod)} - {run.entity} ({run.status})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => payslipsRunId && fetchPayslips(payslipsRunId)}
                disabled={loading || !payslipsRunId}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading payslips...</div>
          ) : !payslipsRunId ? (
            <div className="text-center py-12 text-gray-500">Select a payroll run to view payslips</div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No payslips found for this payroll run</div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-blue-600">Total Payslips</div>
                    <div className="text-2xl font-bold text-black">{payslips.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Total Gross</div>
                    <div className="text-2xl font-bold text-black">
                      ${payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Total Deductions</div>
                    <div className="text-2xl font-bold text-red-600">
                      ${payslips.reduce((sum, p) => sum + (p.totaDeductions || p.totalDeductions || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Total Net Pay</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${payslips.reduce((sum, p) => sum + (p.netPay || 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payslips Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {payslips.map((slip) => (
                  <div
                    key={slip._id}
                    onClick={() => setSelectedPayslip(slip)}
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-black">{slip.employeeName || 'Unknown'}</div>
                        {slip.employeeNumber && (
                          <div className="text-xs text-gray-500">#{slip.employeeNumber}</div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(slip.paymentStatus)}`}>
                        {slip.paymentStatus || 'pending'}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm border-t border-gray-100 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gross:</span>
                        <span className="text-black">${(slip.totalGrossSalary || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deductions:</span>
                        <span className="text-red-600">-${(slip.totaDeductions || slip.totalDeductions || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                        <span className="text-gray-800">Net Pay:</span>
                        <span className="text-green-600">${(slip.netPay || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-blue-600 mt-2 text-center">Click for full breakdown</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Payslip Detail Modal */}
          {selectedPayslip && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPayslip(null)}>
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-black">Payslip Details</h2>
                  <button onClick={() => setSelectedPayslip(null)} className="text-gray-500 hover:text-black text-2xl">&times;</button>
                </div>
                
                <div className="p-6">
                  {/* Employee Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-semibold text-black">{selectedPayslip.employeeName || 'Unknown Employee'}</div>
                        {selectedPayslip.employeeNumber && (
                          <div className="text-sm text-gray-500">Employee #: {selectedPayslip.employeeNumber}</div>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-medium border ${getStatusColor(selectedPayslip.paymentStatus)}`}>
                        {selectedPayslip.paymentStatus || 'pending'}
                      </span>
                    </div>
                    {selectedPayslip.payrollPeriod && (
                      <div className="text-sm text-gray-600 mt-2">Period: {selectedPayslip.payrollPeriod}</div>
                    )}
                    {selectedPayslip.entity && (
                      <div className="text-sm text-gray-600">Entity: {selectedPayslip.entity}</div>
                    )}
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3 flex items-center">
                      <span className="bg-green-100 text-green-600 w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm">+</span>
                      Earnings
                    </h3>
                    <div className="bg-green-50 rounded-lg p-4 space-y-2">
                      {selectedPayslip.earningsDetails && (
                        <>
                          <div className="flex justify-between py-1 border-b border-green-100">
                            <span className="text-gray-700">Base Salary</span>
                            <span className="text-black font-medium">${(selectedPayslip.earningsDetails.baseSalary || 0).toLocaleString()}</span>
                          </div>
                          
                          {/* Allowances - show detailed breakdown */}
                          {Array.isArray(selectedPayslip.earningsDetails.allowances) && selectedPayslip.earningsDetails.allowances.length > 0 && (
                            <div className="border-b border-green-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Allowances</span>
                                <span className="text-black font-medium">
                                  ${selectedPayslip.earningsDetails.allowances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="ml-4 text-sm text-gray-500">
                                {selectedPayslip.earningsDetails.allowances.map((allowance: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-0.5">
                                    <span>{allowance.name || 'Allowance'}</span>
                                    <span>${(allowance.amount || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Bonuses - show detailed breakdown */}
                          {Array.isArray(selectedPayslip.earningsDetails.bonuses) && selectedPayslip.earningsDetails.bonuses.length > 0 && (
                            <div className="border-b border-green-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Bonuses</span>
                                <span className="text-black font-medium">
                                  ${selectedPayslip.earningsDetails.bonuses.reduce((sum: number, b: any) => sum + (b.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="ml-4 text-sm text-gray-500">
                                {selectedPayslip.earningsDetails.bonuses.map((bonus: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-0.5">
                                    <span>{bonus.name || bonus.type || 'Bonus'}</span>
                                    <span>${(bonus.amount || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Benefits */}
                          {Array.isArray(selectedPayslip.earningsDetails.benefits) && selectedPayslip.earningsDetails.benefits.length > 0 && (
                            <div className="border-b border-green-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Benefits</span>
                                <span className="text-black font-medium">
                                  ${selectedPayslip.earningsDetails.benefits.reduce((sum: number, b: any) => sum + (b.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="ml-4 text-sm text-gray-500">
                                {selectedPayslip.earningsDetails.benefits.map((benefit: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-0.5">
                                    <span>{benefit.name || benefit.type || 'Benefit'}</span>
                                    <span>${(benefit.amount || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Refunds */}
                          {Array.isArray(selectedPayslip.earningsDetails.refunds) && selectedPayslip.earningsDetails.refunds.length > 0 && (
                            <div className="border-b border-green-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Refunds</span>
                                <span className="text-black font-medium">
                                  ${selectedPayslip.earningsDetails.refunds.reduce((sum: number, r: any) => sum + (r.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="ml-4 text-sm text-gray-500">
                                {selectedPayslip.earningsDetails.refunds.map((refund: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-0.5">
                                    <span>{refund.reason || refund.description || 'Refund'}</span>
                                    <span>${(refund.amount || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Overtime */}
                          {(selectedPayslip.earningsDetails.overtime || 0) > 0 && (
                            <div className="flex justify-between py-1 border-b border-green-100">
                              <span className="text-gray-700">Overtime</span>
                              <span className="text-black">${(selectedPayslip.earningsDetails.overtime || 0).toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between py-2 font-semibold text-green-700 border-t border-green-200">
                        <span>Total Gross Salary</span>
                        <span>${(selectedPayslip.totalGrossSalary || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3 flex items-center">
                      <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm">-</span>
                      Deductions
                    </h3>
                    <div className="bg-red-50 rounded-lg p-4 space-y-2">
                      {selectedPayslip.deductionsDetails && (
                        <>
                          {/* Tax Deductions */}
                          {(selectedPayslip.deductionsDetails.taxAmount || 0) > 0 && (
                            <div className="border-b border-red-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Taxes</span>
                                <span className="text-red-600 font-medium">${(selectedPayslip.deductionsDetails.taxAmount || 0).toLocaleString()}</span>
                              </div>
                              {Array.isArray(selectedPayslip.deductionsDetails.taxes) && selectedPayslip.deductionsDetails.taxes.length > 0 && (
                                <div className="ml-4 text-sm text-gray-500">
                                  {selectedPayslip.deductionsDetails.taxes.map((tax: any, idx: number) => (
                                    <div key={idx} className="flex justify-between py-0.5">
                                      <span>{tax.name || 'Tax'}</span>
                                      <span>{(tax.rate * 100).toFixed(1)}%</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Insurance Deductions */}
                          {(selectedPayslip.deductionsDetails.insuranceAmount || 0) > 0 && (
                            <div className="border-b border-red-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Social Insurance</span>
                                <span className="text-red-600 font-medium">${(selectedPayslip.deductionsDetails.insuranceAmount || 0).toLocaleString()}</span>
                              </div>
                              {Array.isArray(selectedPayslip.deductionsDetails.insurances) && selectedPayslip.deductionsDetails.insurances.length > 0 && (
                                <div className="ml-4 text-sm text-gray-500">
                                  {selectedPayslip.deductionsDetails.insurances.map((ins: any, idx: number) => (
                                    <div key={idx} className="flex justify-between py-0.5">
                                      <span>{ins.name || 'Insurance'}</span>
                                      <span>{((ins.employeeRate || 0) * 100).toFixed(2)}% (Employee)</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Penalties */}
                          {(selectedPayslip.deductionsDetails.penaltiesAmount || 0) > 0 && (
                            <div className="border-b border-red-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Penalties</span>
                                <span className="text-red-600 font-medium">${(selectedPayslip.deductionsDetails.penaltiesAmount || 0).toLocaleString()}</span>
                              </div>
                              {Array.isArray(selectedPayslip.deductionsDetails.penalties) && selectedPayslip.deductionsDetails.penalties.length > 0 && (
                                <div className="ml-4 text-sm text-gray-500">
                                  {selectedPayslip.deductionsDetails.penalties.map((penalty: any, idx: number) => (
                                    <div key={idx} className="flex justify-between py-0.5">
                                      <span>{penalty.reason || penalty.type || 'Penalty'}</span>
                                      <span>${(penalty.amount || 0).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Unpaid Leave Deductions */}
                          {(selectedPayslip.deductionsDetails.unpaidLeaveAmount || 0) > 0 && (
                            <div className="border-b border-red-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Unpaid Leave</span>
                                <span className="text-red-600 font-medium">${(selectedPayslip.deductionsDetails.unpaidLeaveAmount || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Late Arrival / Early Leave Deductions */}
                          {(selectedPayslip.deductionsDetails.lateDeductionAmount || 0) > 0 && (
                            <div className="border-b border-red-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Late Arrival / Early Leave</span>
                                <span className="text-red-600 font-medium">${(selectedPayslip.deductionsDetails.lateDeductionAmount || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Other Deductions */}
                          {(selectedPayslip.deductionsDetails.otherDeductions || 0) > 0 && (
                            <div className="border-b border-red-100 pb-2">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-700 font-medium">Other Deductions</span>
                                <span className="text-red-600 font-medium">${(selectedPayslip.deductionsDetails.otherDeductions || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between py-2 font-semibold text-red-700 border-t border-red-200">
                        <span>Total Deductions</span>
                        <span>${(selectedPayslip.totaDeductions || selectedPayslip.totalDeductions || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Pay */}
                  <div className="bg-blue-600 text-white rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg">Net Pay</span>
                      <span className="text-2xl font-bold">${(selectedPayslip.netPay || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 text-xs text-gray-500 space-y-1">
                    <div>Payslip ID: {selectedPayslip._id}</div>
                    {selectedPayslip.createdAt && (
                      <div>Generated: {new Date(selectedPayslip.createdAt).toLocaleString()}</div>
                    )}
                    {selectedPayslip.distributedAt && (
                      <div>Distributed: {new Date(selectedPayslip.distributedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="max-w-4xl">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-black">Employee Status Diagnostics</h2>
              <button
                onClick={fetchDiagnostics}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">📋 How Payroll Processing Works</h3>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li><strong>Create Initiation:</strong> You create a payroll run with period and entity (the employee count is just an estimate)</li>
                <li><strong>Submit for Review:</strong> When you click "Submit for Review & Process", the system automatically fetches ALL employees with <code className="bg-blue-100 px-1 rounded">status: 'ACTIVE'</code></li>
                <li><strong>Processing:</strong> For each active employee, it calculates salary, deductions, and creates payslips</li>
                <li><strong>Approval:</strong> Then it moves through Manager → Finance approval workflow</li>
              </ol>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading diagnostics...</div>
            ) : !diagnostics ? (
              <div className="text-center py-8 text-gray-500">Click "Refresh" to load employee status data</div>
            ) : (
              <div className="space-y-6">
                {/* Warning Banner */}
                {diagnostics.activeEmployeesForPayroll === 0 && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">⚠️ WARNING: No Active Employees</h3>
                    <p className="text-red-700 text-sm">
                      There are no employees with <code className="bg-red-100 px-1 rounded">status: 'ACTIVE'</code> in the database. 
                      Payroll runs will have 0 employees until you set employee status to "ACTIVE" in the employee management system.
                    </p>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Total Employees</div>
                    <div className="text-3xl font-bold text-black">{diagnostics.totalEmployees || 0}</div>
                  </div>
                  <div className={`${diagnostics.activeEmployeesForPayroll > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-300'} border rounded-lg p-4`}>
                    <div className="text-sm text-gray-600">Active (Eligible for Payroll)</div>
                    <div className={`text-3xl font-bold ${diagnostics.activeEmployeesForPayroll > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {diagnostics.activeEmployeesForPayroll || 0}
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div>
                  <h3 className="font-semibold text-black mb-3">Status Breakdown</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Status</th>
                          <th className="text-right px-4 py-2 text-sm font-medium text-gray-700">Count</th>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Payroll Eligible?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostics.statusBreakdown?.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-4 py-2 text-black font-mono">{item.status || 'null'}</td>
                            <td className="px-4 py-2 text-right text-black">{item.count}</td>
                            <td className="px-4 py-2">
                              {['ACTIVE', 'Active', 'active'].includes(item.status) ? (
                                <span className="text-green-600">✓ Yes</span>
                              ) : (
                                <span className="text-gray-400">✗ No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!diagnostics.statusBreakdown || diagnostics.statusBreakdown.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-center text-gray-500">No employees found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample Employees */}
                <div>
                  <h3 className="font-semibold text-black mb-3">Sample Employees (First 10)</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Name</th>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Employee #</th>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostics.sampleEmployees?.map((emp: any, idx: number) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-4 py-2 text-black">{emp.name || 'Unknown'}</td>
                            <td className="px-4 py-2 text-gray-600 font-mono text-sm">{emp.employeeNumber || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                ['ACTIVE', 'Active', 'active'].includes(emp.status) 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {emp.status || 'null'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!diagnostics.sampleEmployees || diagnostics.sampleEmployees.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-center text-gray-500">No employees found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Note */}
                {diagnostics.note && (
                  <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    ℹ️ {diagnostics.note}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
