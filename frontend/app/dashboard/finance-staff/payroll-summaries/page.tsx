'use client';

import { useState, useEffect } from 'react';
import { financeStaffService, PayrollSummary, SummaryFilters } from '@/app/services/finance-staff';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function PayrollSummariesPage() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<PayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SummaryFilters>({});
  const [selectedSummary, setSelectedSummary] = useState<PayrollSummary | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // Form state for GenerateReportDto
  const [reportType, setReportType] = useState<string>('monthly');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    const savedSummaries = localStorage.getItem('payrollSummaries');
    if (savedSummaries) {
      try {
        setSummaries(JSON.parse(savedSummaries));
      } catch (error) {
        console.error('Failed to parse saved summaries:', error);
      }
    }
    setLoading(false);
  }, []);

  const allowedRoles = [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!hasAccess) return;
    loadSummaries();
  }, [user, filters]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const response = await financeStaffService.getPayrollSummaries(filters);
      if (response.data) {
        setSummaries(response.data);
        // Save to localStorage
        localStorage.setItem('payrollSummaries', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to load payroll summaries:', error);
      // Load from localStorage as fallback
      const savedSummaries = localStorage.getItem('payrollSummaries');
      if (savedSummaries) {
        try {
          const parsed = JSON.parse(savedSummaries);
          // Apply filters if any
          let filtered = parsed;
          if (filters.type) {
            filtered = filtered.filter((s: PayrollSummary) => s.type === filters.type);
          }
          if (filters.status) {
            filtered = filtered.filter((s: PayrollSummary) => s.status === filters.status);
          }
          if (filters.period) {
            filtered = filtered.filter((s: PayrollSummary) => s.period === filters.period);
          }
          setSummaries(filtered);
        } catch (parseError) {
          console.error('Failed to parse saved summaries:', parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      const reportData = {
        reportType,
        departmentId: departmentId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      
      const response = await financeStaffService.generatePayrollSummary(reportData);
      if (response.data) {
        const updatedSummaries = [response.data!, ...summaries];
        setSummaries(updatedSummaries);
        // Save to localStorage
        localStorage.setItem('payrollSummaries', JSON.stringify(updatedSummaries));
        setShowGenerateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  const resetForm = () => {
    setReportType('monthly');
    setDepartmentId('');
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadSummary = async (summaryId: string) => {
    try {
      const response = await financeStaffService.downloadPayrollSummary(summaryId);
      if (response.data) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payroll-summary-${summaryId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Failed to download summary:', error);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Finance Staff role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Month-End and Year-End Payroll Summaries</h1>
          <p className="text-slate-600 mt-1">Generate and download payroll summaries for audits and reporting</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Summary
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.type || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
            >
              <option value="">All Types</option>
              <option value="month_end">Month-End</option>
              <option value="year_end">Year-End</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
            <input
              type="month"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.period || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadSummaries}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summaries List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Payroll Summaries</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading summaries...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employees</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Gross Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Generated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {summaries.map((summary) => (
                  <tr key={summary.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        summary.type === 'month_end' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {summary.type === 'month_end' ? 'Month-End' : 'Year-End'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{summary.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{summary.employeeCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${summary.totalGrossPay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${summary.totalNetPay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${summary.totalDeductions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        summary.status === 'final' ? 'bg-green-100 text-green-800' :
                        summary.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {summary.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(summary.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedSummary(summary)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadSummary(summary.id)}
                        className="text-slate-600 hover:text-slate-800"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summaries.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No payroll summaries found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Details Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Payroll Summary Details</h3>
              <button
                onClick={() => setSelectedSummary(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Type</label>
                  <p className="text-slate-900 capitalize">{selectedSummary.type.replace('_', '-')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Period</label>
                  <p className="text-slate-900">{selectedSummary.period}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    selectedSummary.status === 'final' ? 'bg-green-100 text-green-800' :
                    selectedSummary.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedSummary.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Generated</label>
                  <p className="text-slate-900">{new Date(selectedSummary.generatedAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Employees</label>
                  <p className="text-xl font-semibold text-slate-900">{selectedSummary.employeeCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Gross Pay</label>
                  <p className="text-xl font-semibold text-slate-900">${selectedSummary.totalGrossPay.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Net Pay</label>
                  <p className="text-xl font-semibold text-slate-900">${selectedSummary.totalNetPay.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Deductions</label>
                  <p className="text-xl font-semibold text-slate-900">${selectedSummary.totalDeductions.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-slate-900 mb-3">Department Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Employees</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Gross Pay</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Net Pay</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Deductions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {selectedSummary.departmentBreakdown.map((dept, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-slate-900">{dept.departmentName}</td>
                          <td className="px-4 py-2 text-sm text-slate-600">{dept.employeeCount}</td>
                          <td className="px-4 py-2 text-sm text-slate-600">${dept.totalGrossPay.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-slate-600">${dept.totalNetPay.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-slate-600">${dept.totalDeductions.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => handleDownloadSummary(selectedSummary.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Summary Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Payroll Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="department">Department</option>
                  <option value="tax">Tax</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department ID (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  placeholder="Enter department ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSummary}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
