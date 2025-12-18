'use client';

import { useEffect, useState } from 'react';
import { payrollExecutionService } from '@/app/services/payroll-execution';

interface PayrollRun {
  _id: string;
  payrollPeriod?: string;
  entity?: string;
  status?: string;
  employees?: number;
  exceptions?: number;
  totalnetpay?: number;
  totalGrossPay?: number;
  totalDeductions?: number;
  totalTaxDeductions?: number;
  totalInsuranceDeductions?: number;
  totalTaxes?: number;
  totalInsurance?: number;
  createdAt?: string;
  approvedByManager?: boolean;
  approvedByManagerAt?: string;
  approvedByFinance?: boolean;
  approvedByFinanceAt?: string;
  frozen?: boolean;
  payslipsGenerated?: boolean;
  payslipsGeneratedAt?: string;
}

interface Payslip {
  _id?: string;
  employeeId?: string;
  employeeName?: string;
  payrollPeriod?: string;
  basePay?: number;
  grossPay?: number;
  netPay?: number;
  taxDeductions?: number;
  insuranceDeductions?: number;
  allowances?: number;
  overtime?: number;
  penalties?: number;
  createdAt?: string;
}

export default function FinanceStaffRunsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    fetchRuns();
  }, [activeTab]);

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

      const res = await payrollExecutionService.listRuns(params);

      if (res?.error) {
        setError(res.error);
        return;
      }

      const data = (res?.data || res) as any;
      let items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Filter based on active tab
      if (activeTab === 'pending') {
        // Show runs approved by manager but not yet by finance (status = pending finance approval)
        items = items.filter((r: PayrollRun) =>
          r.status === 'pending finance approval' || (r.approvedByManager && !r.approvedByFinance)
        );
      } else if (activeTab === 'approved') {
        // Show runs fully approved
        items = items.filter((r: PayrollRun) => r.approvedByFinance || r.status === 'approved');
      }

      setRuns(items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load runs');
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
      // Extract payslips if available
      if (details?.payslips) {
        setPayslips(details.payslips);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFinance = async (id: string) => {
    if (!confirm('Approve this payroll run for payment? This is the final approval step before payroll can be paid out.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.approveByFinance(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll run approved by Finance! Payroll is now ready for payment processing.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslips = async (id: string) => {
    if (!confirm('Generate payslips for all employees in this payroll run?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.generatePayslips(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payslips generated successfully! Employees can now view their payslips.');
      fetchRuns();
      if (selectedRun) {
        fetchRunDetails(selectedRun._id);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate payslips');
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
        <h1 className="text-2xl font-bold text-black mb-2">Finance Staff – Payroll Approval & Payslips</h1>
        <p className="text-gray-600 mb-6">
          Review, approve, and generate payslips for payroll runs. This is the final step before payment processing.
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pending'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            ⏳ Pending Finance Approval
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            ✅ Approved & Ready
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            📋 All Runs
          </button>
          <button
            onClick={fetchRuns}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Summary Stats for Finance */}
        {activeTab === 'pending' && runs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <span className="text-gray-500 text-sm">Pending Runs</span>
              <p className="text-2xl font-bold text-orange-600">{runs.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <span className="text-gray-500 text-sm">Total Employees</span>
              <p className="text-2xl font-bold text-black">{runs.reduce((sum, r) => sum + (r.employees || 0), 0)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <span className="text-gray-500 text-sm">Total Exceptions</span>
              <p className={`text-2xl font-bold ${runs.reduce((sum, r) => sum + (r.exceptions || 0), 0) > 0 ? 'text-red-600' : 'text-black'}`}>
                {runs.reduce((sum, r) => sum + (r.exceptions || 0), 0)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <span className="text-gray-500 text-sm">Total Net Payroll</span>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(runs.reduce((sum, r) => sum + (r.totalnetpay || 0), 0))}</p>
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
                ? 'No payroll runs awaiting finance approval. Payroll must be approved by manager first.'
                : activeTab === 'approved'
                  ? 'No approved payroll runs yet'
                  : 'No payroll runs found'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {runs.map((run) => (
              <div
                key={run._id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedRun(run);
                  fetchRunDetails(run._id);
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-semibold text-black text-lg">
                      {run.payrollPeriod ? new Date(run.payrollPeriod).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'No Period'}
                    </span>
                    <p className="text-sm text-gray-500">{run.entity || 'Default Entity'}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(run.status || '')}`}>
                      {run.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                    {run.payslipsGenerated && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        📄 Payslips Ready
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

                {/* Financial Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Gross Pay:</span>
                    <span className="text-black">{formatCurrency(run.totalGrossPay)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Total Taxes:</span>
                    <span className="text-red-600">-{formatCurrency(run.totalTaxes || run.totalTaxDeductions)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Insurance:</span>
                    <span className="text-red-600">-{formatCurrency(run.totalInsurance || run.totalInsuranceDeductions)}</span>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <span className="text-gray-500 text-sm">Total Net Pay:</span>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(run.totalnetpay)}</p>
                </div>

                {/* Approval Status */}
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${run.approvedByManager ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {run.approvedByManager ? '✓ Manager' : '○ Manager'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${run.approvedByFinance ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    {run.approvedByFinance ? '✓ Finance' : '⏳ Finance'}
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
                      Finance Review
                    </h2>
                    <p className="text-gray-500">
                      {selectedRun.payrollPeriod ? new Date(selectedRun.payrollPeriod).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'No Period'}
                      {' - '}{selectedRun.entity || 'Default Entity'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedRun(null); setRunDetails(null); setPayslips([]); }}
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
                  {selectedRun.payslipsGenerated && (
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      📄 Payslips Generated
                    </span>
                  )}
                </div>

                {/* Financial Breakdown */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-black mb-3">Financial Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-gray-500 text-sm">Employees</span>
                      <p className="text-2xl font-bold text-black">{selectedRun.employees || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Total Gross Pay</span>
                      <p className="text-xl font-bold text-black">{formatCurrency(selectedRun.totalGrossPay || runDetails?.totalGrossPay)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Total Deductions</span>
                      <p className="text-xl font-bold text-red-600">-{formatCurrency(selectedRun.totalDeductions || runDetails?.totalDeductions)}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg -m-2">
                      <span className="text-gray-500 text-sm">Total Net Pay</span>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedRun.totalnetpay)}</p>
                    </div>
                  </div>
                </div>

                {/* Deductions Breakdown */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <span className="text-gray-600 text-sm">Taxes</span>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(
                      selectedRun.totalTaxes || selectedRun.totalTaxDeductions ||
                      runDetails?.totalTaxes || runDetails?.totalTaxDeductions
                    )}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <span className="text-gray-600 text-sm">Social Insurance</span>
                    <p className="text-xl font-bold text-orange-700">{formatCurrency(
                      selectedRun.totalInsurance || selectedRun.totalInsuranceDeductions ||
                      runDetails?.totalInsurance || runDetails?.totalInsuranceDeductions
                    )}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <span className="text-gray-600 text-sm">Other Deductions</span>
                    <p className="text-xl font-bold text-yellow-700">
                      {formatCurrency(
                        (selectedRun.totalDeductions || 0)
                        - (selectedRun.totalTaxes || selectedRun.totalTaxDeductions || 0)
                        - (selectedRun.totalInsurance || selectedRun.totalInsuranceDeductions || 0)
                      )}
                    </p>
                  </div>
                </div>

                {/* Approval Workflow */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-black mb-3">Approval Workflow</h3>
                  <div className="flex gap-4">
                    <div className={`flex-1 p-4 rounded-lg border-2 ${selectedRun.approvedByManager ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{selectedRun.approvedByManager ? '✅' : '○'}</span>
                        <span className="font-medium text-black">Step 1: Manager</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedRun.approvedByManager
                          ? `Approved ${selectedRun.approvedByManagerAt ? formatDate(selectedRun.approvedByManagerAt) : ''}`
                          : 'Pending'}
                      </p>
                    </div>
                    <div className="flex items-center text-gray-400">→</div>
                    <div className={`flex-1 p-4 rounded-lg border-2 ${selectedRun.approvedByFinance
                        ? 'bg-green-50 border-green-300'
                        : selectedRun.approvedByManager
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">
                          {selectedRun.approvedByFinance ? '✅' : selectedRun.approvedByManager ? '⏳' : '○'}
                        </span>
                        <span className="font-medium text-black">Step 2: Finance</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedRun.approvedByFinance
                          ? `Approved ${selectedRun.approvedByFinanceAt ? formatDate(selectedRun.approvedByFinanceAt) : ''}`
                          : selectedRun.approvedByManager
                            ? 'Your action required'
                            : 'Waiting for manager'}
                      </p>
                    </div>
                    <div className="flex items-center text-gray-400">→</div>
                    <div className={`flex-1 p-4 rounded-lg border-2 ${selectedRun.payslipsGenerated
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-gray-50 border-gray-200'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">
                          {selectedRun.payslipsGenerated ? '📄' : '○'}
                        </span>
                        <span className="font-medium text-black">Step 3: Payslips</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedRun.payslipsGenerated
                          ? `Generated ${selectedRun.payslipsGeneratedAt ? formatDate(selectedRun.payslipsGeneratedAt) : ''}`
                          : 'Pending generation'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payslips Section */}
                {payslips.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-black mb-3">Generated Payslips</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-2 text-black">Employee</th>
                            <th className="text-right p-2 text-black">Base Pay</th>
                            <th className="text-right p-2 text-black">Gross</th>
                            <th className="text-right p-2 text-black">Tax</th>
                            <th className="text-right p-2 text-black">Insurance</th>
                            <th className="text-right p-2 text-black">Net Pay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payslips.slice(0, 10).map((slip, idx) => (
                            <tr key={slip._id || idx} className="border-b border-gray-100">
                              <td className="p-2 text-black">{slip.employeeName || slip.employeeId?.toString().slice(-8) || '-'}</td>
                              <td className="text-right p-2 text-black">{formatCurrency(slip.basePay)}</td>
                              <td className="text-right p-2 text-black">{formatCurrency(slip.grossPay)}</td>
                              <td className="text-right p-2 text-red-600">-{formatCurrency(slip.taxDeductions)}</td>
                              <td className="text-right p-2 text-red-600">-{formatCurrency(slip.insuranceDeductions)}</td>
                              <td className="text-right p-2 text-green-700 font-medium">{formatCurrency(slip.netPay)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {payslips.length > 10 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Showing 10 of {payslips.length} payslips
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Exceptions Warning */}
                {(selectedRun.exceptions || 0) > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <span className="text-xl">⚠️</span>
                      <span className="font-semibold">This run has {selectedRun.exceptions} exception(s)</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      Review exceptions before approving. Exceptions may include negative net pay,
                      minimum wage violations, missing contract data, etc.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t pt-4 space-y-3">
                  {/* Finance Approve button - show for pending finance approval status */}
                  {selectedRun.status === 'pending finance approval' && (
                    <button
                      onClick={() => handleApproveFinance(selectedRun._id)}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓ Finance Approve – Final Approval
                    </button>
                  )}

                  {/* Info for draft status */}
                  {selectedRun.status === 'draft' && (
                    <div className="text-center text-yellow-600 py-4 bg-yellow-50 rounded-lg">
                      📝 Draft - Awaiting specialist submission
                    </div>
                  )}

                  {/* Generate Payslips button - show after status is approved or locked */}
                  {(selectedRun.status === 'approved' || selectedRun.status === 'locked') && !selectedRun.payslipsGenerated && (
                    <button
                      onClick={() => handleGeneratePayslips(selectedRun._id)}
                      disabled={loading}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                      📄 Generate & Distribute Payslips
                    </button>
                  )}

                  {/* Status info messages */}
                  {(selectedRun.status === 'approved' || selectedRun.status === 'locked') && selectedRun.payslipsGenerated && (
                    <div className="text-center py-4">
                      <span className="text-green-600 font-medium">
                        ✅ Payroll approved and payslips distributed!
                      </span>
                    </div>
                  )}

                  {(selectedRun.status === 'locked' || selectedRun.status === 'frozen') && !selectedRun.payslipsGenerated && (
                    <div className="text-center text-blue-600 py-4 bg-blue-50 rounded-lg mt-2">
                      🔒 Payroll is frozen/locked - Ready for payslip generation
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