'use client';

import { useState, useEffect } from 'react';
import { financeStaffService, PayrollSummary, SummaryFilters, TaxReport, PayslipHistoryReport } from '@/app/services/finance-staff';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

type SummaryTab = 'payroll' | 'tax' | 'payslip';

export default function PayrollSummariesPage() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<PayrollSummary[]>([]);
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [payslipHistoryReports, setPayslipHistoryReports] = useState<PayslipHistoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SummaryFilters>({});
  const [selectedSummary, setSelectedSummary] = useState<PayrollSummary | null>(null);
  const [selectedTaxReport, setSelectedTaxReport] = useState<TaxReport | null>(null);
  const [selectedPayslipReport, setSelectedPayslipReport] = useState<PayslipHistoryReport | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<SummaryTab>('payroll');
  
  // Time period filters
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  
  // Form state for GenerateReportDto
  const [reportType, setReportType] = useState<string>('monthly');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Generate year options
  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Load from localStorage on mount
  useEffect(() => {
    const savedSummaries = localStorage.getItem('payrollSummaries');
    const savedTaxReports = localStorage.getItem('taxReports');
    const savedPayslipHistory = localStorage.getItem('payslipHistoryReports');
    
    if (savedSummaries) {
      try { setSummaries(JSON.parse(savedSummaries)); } catch (e) { console.error('Failed to parse summaries:', e); }
    }
    if (savedTaxReports) {
      try { setTaxReports(JSON.parse(savedTaxReports)); } catch (e) { console.error('Failed to parse tax reports:', e); }
    }
    if (savedPayslipHistory) {
      try { setPayslipHistoryReports(JSON.parse(savedPayslipHistory)); } catch (e) { console.error('Failed to parse payslip history:', e); }
    }
    setLoading(false);
  }, []);

  const allowedRoles = [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!hasAccess) return;
    loadAllReports();
  }, [user, selectedYear, selectedMonth, periodType]);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const period = selectedMonth ? `${selectedYear}-${selectedMonth}` : selectedYear;
      
      // Load all reports in parallel
      const [summaryResponse, taxResponse, payslipResponse] = await Promise.all([
        financeStaffService.getPayrollSummaries({ ...filters, period }),
        financeStaffService.getTaxReports(period),
        financeStaffService.getPayslipHistory(period),
      ]);
      
      if (summaryResponse.data) {
        setSummaries(summaryResponse.data);
        localStorage.setItem('payrollSummaries', JSON.stringify(summaryResponse.data));
      }
      if (taxResponse?.data) {
        setTaxReports(taxResponse.data);
        localStorage.setItem('taxReports', JSON.stringify(taxResponse.data));
      }
      if (payslipResponse?.data) {
        setPayslipHistoryReports(payslipResponse.data);
        localStorage.setItem('payslipHistoryReports', JSON.stringify(payslipResponse.data));
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Load from localStorage as fallback - filter by period
      filterLocalStorageReports();
    } finally {
      setLoading(false);
    }
  };

  const filterLocalStorageReports = () => {
    const period = selectedMonth ? `${selectedYear}-${selectedMonth}` : selectedYear;
    
    // Filter summaries
    const savedSummaries = localStorage.getItem('payrollSummaries');
    if (savedSummaries) {
      try {
        const parsed = JSON.parse(savedSummaries);
        const filtered = parsed.filter((s: PayrollSummary) => 
          periodType === 'yearly' ? s.period?.startsWith(selectedYear) : s.period === period
        );
        setSummaries(filtered);
      } catch (e) { console.error(e); }
    }
    
    // Filter tax reports
    const savedTax = localStorage.getItem('taxReports');
    if (savedTax) {
      try {
        const parsed = JSON.parse(savedTax);
        const filtered = parsed.filter((r: TaxReport) => 
          periodType === 'yearly' ? r.period?.startsWith(selectedYear) : r.period === period
        );
        setTaxReports(filtered);
      } catch (e) { console.error(e); }
    }
    
    // Filter payslip history
    const savedPayslip = localStorage.getItem('payslipHistoryReports');
    if (savedPayslip) {
      try {
        const parsed = JSON.parse(savedPayslip);
        const filtered = parsed.filter((r: PayslipHistoryReport) => 
          periodType === 'yearly' ? r.period?.startsWith(selectedYear) : r.period === period
        );
        setPayslipHistoryReports(filtered);
      } catch (e) { console.error(e); }
    }
  };

  const handleGenerateSummary = async () => {
    try {
      const period = selectedMonth ? `${selectedYear}-${selectedMonth}` : selectedYear;
      const summaryType = reportType === 'yearly' ? 'year_end' : 'month_end';
      const reportData = {
        reportType: summaryType,
        departmentId: departmentId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      const summaryResponse = await financeStaffService.generatePayrollSummary(reportData);
      if (summaryResponse.data) {
        const updatedSummaries = [summaryResponse.data, ...summaries];
        setSummaries(updatedSummaries);
        localStorage.setItem('payrollSummaries', JSON.stringify(updatedSummaries));
      }
      setShowGenerateModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleDeleteSummary = (id: string) => {
    const updated = summaries.filter(s => s.id !== id);
    setSummaries(updated);
    localStorage.setItem('payrollSummaries', JSON.stringify(updated));
    setSelectedSummary(null);
  };

  const handleDeleteTaxReport = (id: string) => {
    const updated = taxReports.filter((r: any) => r.id !== id);
    setTaxReports(updated);
    localStorage.setItem('taxReports', JSON.stringify(updated));
    setSelectedTaxReport(null);
  };

  const handleDeletePayslipReport = (id: string) => {
    const updated = payslipHistoryReports.filter((r: any) => r.id !== id);
    setPayslipHistoryReports(updated);
    localStorage.setItem('payslipHistoryReports', JSON.stringify(updated));
    setSelectedPayslipReport(null);
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

  // Tab counts
  const tabCounts = {
    payroll: summaries.length,
    tax: taxReports.length,
    payslip: payslipHistoryReports.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Month-End and Year-End Payroll Summaries</h1>
          <p className="text-slate-600 mt-1">Generate and view payroll summaries, tax reports, and payslip history for audits and reporting</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Report
        </button>
      </div>

      {/* Time Period Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period Type</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={periodType}
              onChange={(e) => {
                setPeriodType(e.target.value as 'monthly' | 'yearly');
                if (e.target.value === 'yearly') setSelectedMonth('');
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          {periodType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">All Months</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={loadAllReports}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {[
              { id: 'payroll' as SummaryTab, label: 'Payroll Summary', count: tabCounts.payroll },
              { id: 'tax' as SummaryTab, label: 'Tax Reports', count: tabCounts.tax },
              { id: 'payslip' as SummaryTab, label: 'Payslip History', count: tabCounts.payslip },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-500 mt-2">Loading reports...</p>
            </div>
          ) : (
            <>
              {/* Payroll Summary Tab */}
              {activeTab === 'payroll' && (
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
                      {summaries.map((summary, idx) => (
                        <tr key={summary.id || idx} className="hover:bg-slate-50">
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
                            ${summary.totalGrossPay?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            ${summary.totalNetPay?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            ${summary.totalDeductions?.toLocaleString() || '0'}
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
                      No payroll summaries found for the selected period
                    </div>
                  )}
                </div>
              )}

              {/* Tax Reports Tab */}
              {activeTab === 'tax' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Report Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Generated</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {taxReports.map((report: any) => (
                        <tr key={report.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {report.name || `Tax Report - ${report.period}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.period}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => setSelectedTaxReport(report)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {taxReports.length === 0 && (
                    <div className="p-6 text-center text-slate-500">
                      No tax reports found for the selected period
                    </div>
                  )}
                </div>
              )}

              {/* Payslip History Tab */}
              {activeTab === 'payslip' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Report Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Generated</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {payslipHistoryReports.map((report: any) => (
                        <tr key={report.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {report.name || `Payslip History - ${report.period}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.period}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => setSelectedPayslipReport(report)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {payslipHistoryReports.length === 0 && (
                    <div className="p-6 text-center text-slate-500">
                      No payslip history reports found for the selected period
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => handleDeleteSummary(selectedSummary.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
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

      {/* Tax Report Details Modal */}
      {selectedTaxReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Tax Report Details</h3>
              <button
                onClick={() => setSelectedTaxReport(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-slate-500">Report Name</label>
                  <p className="text-slate-900">{selectedTaxReport.name || `Tax Report - ${selectedTaxReport.period}`}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Period</label>
                  <p className="text-slate-900">{selectedTaxReport.period}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Generated</label>
                  <p className="text-slate-900">{selectedTaxReport.generatedAt ? new Date(selectedTaxReport.generatedAt).toLocaleString() : '-'}</p>
                </div>
              </div>
              
              {selectedTaxReport.taxRules && selectedTaxReport.taxRules.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-slate-900 mb-3">Tax Rules</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Rate</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Min Income</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Max Income</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {selectedTaxReport.taxRules.map((rule: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-slate-900">{rule.name}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">{rule.taxType}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">{rule.rate}%</td>
                            <td className="px-4 py-2 text-sm text-slate-600">${rule.minIncome?.toLocaleString() || '0'}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">${rule.maxIncome?.toLocaleString() || 'No limit'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => handleDeleteTaxReport(selectedTaxReport.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedTaxReport(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History Details Modal */}
      {selectedPayslipReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Payslip History Report Details</h3>
              <button
                onClick={() => setSelectedPayslipReport(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-slate-500">Report Name</label>
                  <p className="text-slate-900">{selectedPayslipReport.name || `Payslip History - ${selectedPayslipReport.period}`}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Period</label>
                  <p className="text-slate-900">{selectedPayslipReport.period}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Generated</label>
                  <p className="text-slate-900">{selectedPayslipReport.generatedAt ? new Date(selectedPayslipReport.generatedAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Payslips</label>
                  <p className="text-slate-900">{selectedPayslipReport.payslips?.length || 0}</p>
                </div>
              </div>
              
              {selectedPayslipReport.payslips && selectedPayslipReport.payslips.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-slate-900 mb-3">Payslips</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Pay Period</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Gross Pay</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Net Pay</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {selectedPayslipReport.payslips.map((payslip: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-slate-900">{payslip.employeeId || payslip.employeeName || '-'}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">{payslip.payPeriod || '-'}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">${payslip.grossPay?.toLocaleString() || '0'}</td>
                            <td className="px-4 py-2 text-sm text-slate-600">${payslip.netPay?.toLocaleString() || '0'}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                payslip.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payslip.status || 'pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => handleDeletePayslipReport(selectedPayslipReport.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedPayslipReport(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Summary Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Payroll Summary</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Summary Type</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={reportType}
                  onChange={(e) => {
                    setReportType(e.target.value);
                    if (e.target.value === 'yearly') {
                      setSelectedMonth('');
                    }
                  }}
                >
                  <option value="monthly">Monthly Summary</option>
                  <option value="yearly">Yearly Summary</option>
                </select>
              </div>
              
              {reportType === 'yearly' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2099"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    placeholder="Enter year (e.g., 2025)"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Month</label>
                  <input
                    type="month"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedMonth ? `${selectedYear}-${selectedMonth}` : `${selectedYear}-01`}
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-');
                      setSelectedYear(year);
                      setSelectedMonth(month);
                    }}
                  />
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Selected Period:</strong> {reportType === 'yearly' 
                    ? `Year ${selectedYear}` 
                    : `${months.find(m => m.value === selectedMonth)?.label || 'January'} ${selectedYear}`}
                </p>
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
                Generate All Reports
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
