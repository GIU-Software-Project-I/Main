'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { payrollSpecialistService, DepartmentalReport, ReportFilters, PayrollSummaryReport, type Department } from '@/app/services/payroll-specialist';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

type ReportType = 'summary' | 'tax' | 'payslip';
type PeriodType = 'monthly' | 'quarterly' | 'yearly';

export default function DepartmentalReportsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<DepartmentalReport[]>([]);
  const [summaryReports, setSummaryReports] = useState<PayrollSummaryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [departments, setDepartments] = useState<{ _id: string; name: string; code?: string }[]>([]);
  const [selectedReport, setSelectedReport] = useState<DepartmentalReport | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const allowedRoles = [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  // Load reports from localStorage on mount
  useEffect(() => {
    const savedReports = localStorage.getItem('departmentalReports');
    if (savedReports) {
      try {
        setReports(JSON.parse(savedReports));
      } catch (error) {
        console.error('Failed to load saved reports:', error);
      }
    }
  }, []);

  // Save reports to localStorage whenever they change
  useEffect(() => {
    if (reports.length > 0) {
      localStorage.setItem('departmentalReports', JSON.stringify(reports));
    }
  }, [reports]);

  const [generateForm, setGenerateForm] = useState<{ 
    departmentId: string; 
    period: string;
    reportType: string;
    startDate: string;
    endDate: string;
  }>({ departmentId: '', period: '', reportType: 'departmental', startDate: '', endDate: '' });
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Enhanced form state for new report types
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [currentReport, setCurrentReport] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    
    const authorized = !!hasAccess;
    setIsAuthorized(authorized);
    
    if (!authorized) {
      router.push('/unauthorized');
      return;
    }
    
    const loadData = async () => {
      try {
        await Promise.all([fetchDepartments(), loadReports()]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, authLoading, router]);

  const fetchDepartments = async () => {
    try {
      const res = await payrollExecutionService.listDepartments();
      const data = res?.data || res;
      if (Array.isArray(data)) {
        setDepartments(
          data.map((d: any) => ({
            _id: d._id?.toString?.() || d._id || '',
            name: d.name || d.departmentName || d.code || 'Unknown',
            code: d.code,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const [deptResponse, summaryResponse] = await Promise.all([
        payrollSpecialistService.getDepartmentalReports(filters),
        payrollSpecialistService.getPayrollSummaryReports(),
      ]);
      
      if (deptResponse.data) setReports(deptResponse.data);
      if (summaryResponse.data) setSummaryReports(summaryResponse.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      const reportData = {
        reportType: generateForm.reportType,
        departmentId: generateForm.departmentId || undefined,
        startDate: generateForm.startDate || undefined,
        endDate: generateForm.endDate || undefined
      };
      
      const response = await payrollSpecialistService.generateDepartmentalReport(reportData);
      
      console.log('Generate report response:', response);
      
      // Extract data from response
      const responseData: any = response.data || response;
      
      // Use the reports array directly if it exists
      if (responseData.reports && Array.isArray(responseData.reports) && responseData.reports.length > 0) {
        setReports(prev => [...responseData.reports, ...prev]);
      } else {
        // Fallback: create report from response metadata
        const newReport: DepartmentalReport = {
          id: `report_${Date.now()}`,
          departmentId: generateForm.departmentId,
          departmentName: departments.find(d => d._id === generateForm.departmentId)?.name || 'Unknown',
          period: generateForm.startDate && generateForm.endDate 
            ? `${new Date(generateForm.startDate).toLocaleDateString()} - ${new Date(generateForm.endDate).toLocaleDateString()}`
            : 'All Time',
          totalEmployees: 0,
          totalGrossPay: 0,
          totalNetPay: 0,
          totalDeductions: 0,
          totalTaxes: 0,
          averageSalary: 0,
          status: 'draft',
          generatedAt: responseData.generatedDate || new Date().toISOString(),
          costCenter: departments.find(d => d._id === generateForm.departmentId)?.code || ''
        };
        
        setReports(prev => [newReport, ...prev]);
        console.warn('No payslip data found for this department/period. Created placeholder report.');
      }
      
      setShowGenerateModal(false);
      resetGenerateForm();
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetGenerateForm = () => {
    setGenerateForm({ 
      departmentId: '', 
      period: '', 
      reportType: 'departmental',
      startDate: '',
      endDate: ''
    });
  };

  const handleDownloadReport = async (reportId: string, format: 'pdf' | 'excel' = 'pdf') => {
    try {
      const response = await payrollSpecialistService.exportReport(reportId, format);
      if (response.data) {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payroll-report-${reportId}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Payroll Specialist role required.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Departmental Payroll Reports</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.departmentId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Center</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.costCenter || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, costCenter: e.target.value || undefined }))}
            >
              <option value="">All Cost Centers</option>
              {departments
                .filter((d) => d.code)
                .map((dept) => (
                  <option key={dept._id} value={dept.code}>
                    {dept.code} — {dept.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadReports}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Departmental Reports */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Departmental Reports</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading reports...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employees</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Gross Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {report.departmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.totalEmployees || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${(report.totalGrossPay || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${(report.totalNetPay || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.status === 'final' ? 'bg-green-100 text-green-800' :
                        report.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setCurrentReport(report);
                        }}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          // Create a simple CSV download
                          const csvContent = [
                            ['Department', 'Period', 'Employees', 'Gross Pay', 'Net Pay', 'Deductions'],
                            [report.departmentName, report.period, report.totalEmployees || 0, report.totalGrossPay || 0, report.totalNetPay || 0, report.totalDeductions || 0]
                          ].map(row => row.join(',')).join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `report-${report.departmentName}-${Date.now()}.csv`;
                          link.click();
                        }}
                        className="text-slate-600 hover:text-slate-800"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reports.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No departmental reports found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Standard Reports */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Standard Reports</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {summaryReports.map((report) => (
            <div key={report.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{report.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{report.period}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    {report.employeeCount || 0} employees • ${(report.totalAmount || 0).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadReport(report.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Departmental Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateForm.reportType}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, reportType: e.target.value }))}
                >
                  <option value="departmental">Departmental</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="tax">Tax</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateForm.departmentId}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, departmentId: e.target.value }))}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateForm.startDate}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateForm.endDate}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, endDate: e.target.value }))}
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
                disabled={!generateForm.departmentId}
                onClick={handleGenerateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Report Details</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Department</label>
                  <p className="text-base text-slate-900">{selectedReport.departmentName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Period</label>
                  <p className="text-base text-slate-900">{selectedReport.period || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Employees</label>
                  <p className="text-base text-slate-900">{selectedReport.totalEmployees || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <p className="text-base text-slate-900 capitalize">{selectedReport.status || 'N/A'}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Gross Pay</label>
                    <p className="text-lg font-semibold text-slate-900">${(selectedReport.totalGrossPay || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Net Pay</label>
                    <p className="text-lg font-semibold text-slate-900">${(selectedReport.totalNetPay || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Deductions</label>
                    <p className="text-lg font-semibold text-red-600">${(selectedReport.totalDeductions || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Average Salary</label>
                    <p className="text-lg font-semibold text-slate-900">${(selectedReport.averageSalary || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-slate-500">Generated At</label>
                <p className="text-base text-slate-900">{new Date(selectedReport.generatedAt).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
