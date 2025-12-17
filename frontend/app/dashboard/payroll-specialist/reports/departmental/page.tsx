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
  const [allGeneratedReports, setAllGeneratedReports] = useState<any[]>([]); // All generated reports
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
    const savedAllReports = localStorage.getItem('allGeneratedReports');
    if (savedReports) {
      try {
        setReports(JSON.parse(savedReports));
      } catch (error) {
        console.error('Failed to load saved reports:', error);
      }
    }
    if (savedAllReports) {
      try {
        setAllGeneratedReports(JSON.parse(savedAllReports));
      } catch (error) {
        console.error('Failed to load saved all reports:', error);
      }
    }
  }, []);

  // Save reports to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('departmentalReports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('allGeneratedReports', JSON.stringify(allGeneratedReports));
  }, [allGeneratedReports]);

  const [generateForm, setGenerateForm] = useState<{ 
    departmentId: string; 
    period: string;
    reportType: 'payroll_summary' | 'tax_report' | 'payslip_history' | 'departmental_payroll';
    startDate: string;
    endDate: string;
  }>({ departmentId: '', period: '', reportType: 'payroll_summary', startDate: '', endDate: '' });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Validate dates
  const validateDates = (): boolean => {
    setDateError(null);
    
    if (!generateForm.startDate || !generateForm.endDate) {
      setDateError('Both start and end dates are required');
      return false;
    }

    const start = new Date(generateForm.startDate);
    const end = new Date(generateForm.endDate);

    if (start > end) {
      setDateError('Start date must be before or equal to end date');
      return false;
    }

    return true;
  };

  const handleGenerateReport = async () => {
    setError(null);
    setDateError(null);

    // Validate dates
    if (!validateDates()) {
      return;
    }

    // Validate department for departmental report
    if (generateForm.reportType === 'departmental_payroll' && !generateForm.departmentId) {
      setError('Please select a department for Departmental Payroll Report');
      return;
    }

    try {
      setLoading(true);
      
      let response;
      const filters = {
        startDate: generateForm.startDate,
        endDate: generateForm.endDate,
        departmentId: generateForm.departmentId || undefined,
      };

      // Call appropriate API based on report type
      switch (generateForm.reportType) {
        case 'departmental_payroll':
          response = await payrollSpecialistService.generateDepartmentalReport({
            reportType: 'departmental',
            departmentId: generateForm.departmentId,
            startDate: generateForm.startDate,
            endDate: generateForm.endDate,
          });
          break;

        case 'tax_report':
          response = await payrollSpecialistService.generateTaxReport(filters);
          break;

        case 'payslip_history':
          response = await payrollSpecialistService.generatePaySlipHistoryReport(filters);
          break;

        case 'payroll_summary':
          response = await payrollSpecialistService.generateStandardPayrollSummary(filters);
          break;

        default:
          throw new Error('Invalid report type');
      }
      
      console.log('Generate report response:', response);
      
      // Extract data from response
      const responseData: any = response.data || response;
      console.log('Tax Report Data:', responseData);
      console.log('Tax Rules:', responseData.taxRules);
      
      // Store current report for display
      const newGeneratedReport = {
        id: `report_${Date.now()}`,
        reportType: generateForm.reportType,
        generatedAt: new Date().toISOString(),
        filters: {
          ...generateForm,
          departmentName: departments.find(d => d._id === generateForm.departmentId)?.name,
        },
        data: responseData,
      };
      setCurrentReport(newGeneratedReport);
      
      // Add to all generated reports and save to localStorage immediately
      const updatedReports = [newGeneratedReport, ...allGeneratedReports];
      setAllGeneratedReports(updatedReports);
      localStorage.setItem('allGeneratedReports', JSON.stringify(updatedReports));
      
      // For departmental reports, also add to the reports table
      if (generateForm.reportType === 'departmental_payroll') {
        const newReport: DepartmentalReport = {
          id: newGeneratedReport.id,
          departmentId: generateForm.departmentId,
          departmentName: departments.find(d => d._id === generateForm.departmentId)?.name || 'Unknown',
          period: `${new Date(generateForm.startDate).toLocaleDateString()} - ${new Date(generateForm.endDate).toLocaleDateString()}`,
          totalEmployees: responseData.data?.totalEmployees || responseData.totalEmployees || 0,
          totalGrossPay: responseData.data?.totalGrossPay || responseData.totalGrossPay || 0,
          totalNetPay: responseData.data?.totalNetPay || responseData.totalNetPay || 0,
          totalDeductions: responseData.data?.totalDeductions || responseData.totalDeductions || 0,
          totalTaxes: responseData.data?.totalTaxes || responseData.totalTaxes || 0,
          averageSalary: responseData.data?.averageSalary || responseData.averageSalary || 0,
          status: 'final',
          generatedAt: new Date().toISOString(),
          costCenter: departments.find(d => d._id === generateForm.departmentId)?.code || ''
        };
        setReports(prev => [newReport, ...prev]);
      }
      
      // If backend returns reports array, add them too
      if (responseData.reports && Array.isArray(responseData.reports) && responseData.reports.length > 0) {
        setReports(prev => [...responseData.reports, ...prev]);
      }
      
      setShowGenerateModal(false);
      resetGenerateForm();
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(err.response?.data?.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetGenerateForm = () => {
    setGenerateForm({ 
      departmentId: '', 
      period: '', 
      reportType: 'payroll_summary',
      startDate: '',
      endDate: ''
    });
  };

  // Export to CSV (for Payroll Summary)
  const handleExportCSV = () => {
    if (!currentReport || currentReport.reportType !== 'payroll_summary') return;

    try {
      const data = currentReport.data;
      let csvContent = 'data:text/csv;charset=utf-8,';

      // CSV Headers
      csvContent += 'Department,Employee ID,Employee Name,Period,Gross Pay,Net Pay,Tax Deducted,Total Deductions\n';

      // Add data rows
      if (data.payslips && Array.isArray(data.payslips)) {
        data.payslips.forEach((record: any) => {
          csvContent += `${record.departmentName || 'N/A'},${record.employeeId || 'N/A'},${record.employeeName || 'N/A'},${generateForm.startDate} to ${generateForm.endDate},${record.grossPay || 0},${record.netPay || 0},${record.taxAmount || 0},${record.totalDeductions || 0}\n`;
        });
      } else if (data.summary) {
        // Alternative structure
        csvContent += `All Departments,N/A,N/A,${generateForm.startDate} to ${generateForm.endDate},${data.summary.totalGross || 0},${data.summary.totalNet || 0},${data.summary.totalTax || 0},${(data.summary.totalGross || 0) - (data.summary.totalNet || 0)}\n`;
      }

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `payroll_summary_${generateForm.startDate}_to_${generateForm.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export CSV:', error);
      setError('Failed to export CSV file');
    }
  };

  // Get report type label
  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'payroll_summary':
        return 'Payroll Summary';
      case 'tax_report':
        return 'Tax Report';
      case 'payslip_history':
        return 'Payslip History';
      case 'departmental_payroll':
        return 'Departmental Payroll Report';
      default:
        return type;
    }
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
                {reports.filter(report => !('reportType' in report) || (report as any).reportType === 'departmental_payroll').map((report) => (
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
          <h2 className="text-lg font-semibold text-slate-900">Other Reports</h2>
        </div>
        {allGeneratedReports.filter(r => r.reportType !== 'departmental_payroll').length === 0 && summaryReports.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            No other reports found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            {allGeneratedReports.filter(r => r.reportType !== 'departmental_payroll').map((report) => (
              <div key={report.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col">
                  <div className="mb-3">
                    <h3 className="font-medium text-slate-900">{getReportTypeLabel(report.reportType)}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(report.filters.startDate).toLocaleDateString()} - {new Date(report.filters.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Generated: {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentReport(report)}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        // Create comprehensive CSV download
                        let csvContent = '';
                        
                        if (report.reportType === 'tax_report' && report.data) {
                          // Tax Report CSV with all details
                          csvContent += 'TAX RULES REPORT\n\n';
                          csvContent += `Period,${new Date(report.filters.startDate).toLocaleDateString()} - ${new Date(report.filters.endDate).toLocaleDateString()}\n`;
                          csvContent += `Generated,${new Date(report.generatedAt).toLocaleString()}\n\n`;
                          
                          // Tax Rules - with detailed attributes
                          const rules = report.data.taxRules || [];
                          if (rules.length > 0) {
                            csvContent += 'TAX RULES\n';
                            csvContent += 'ID,Name,Description,Status,Created At,Updated At\n';
                            rules.forEach((rule: any) => {
                              csvContent += `"${rule.id || rule._id || 'N/A'}","${rule.name || 'N/A'}","${rule.description || ''}","${rule.status || 'N/A'}","${rule.createdAt ? new Date(rule.createdAt).toLocaleString() : ''}","${rule.updatedAt ? new Date(rule.updatedAt).toLocaleString() : ''}"\n`;
                            });
                            csvContent += '\n';
                            
                            // Tax Components for each rule
                            csvContent += 'TAX COMPONENTS\n';
                            csvContent += 'Rule Name,Component ID,Component Name,Type,Description,Rate (%),Min Amount,Max Amount,Is Active,Created At,Updated At\n';
                            rules.forEach((rule: any) => {
                              if (rule.taxComponents && rule.taxComponents.length > 0) {
                                rule.taxComponents.forEach((component: any) => {
                                  csvContent += `"${rule.name || ''}","${component._id || component.id || ''}","${component.name || ''}","${component.type || ''}","${component.description || ''}",${component.rate || 0},${component.minAmount || 0},${component.maxAmount || 0},${component.isActive ? 'Yes' : 'No'},"${component.createdAt ? new Date(component.createdAt).toLocaleString() : ''}","${component.updatedAt ? new Date(component.updatedAt).toLocaleString() : ''}"\n`;
                                });
                              }
                            });
                          } else {
                            csvContent += 'No tax rules found for this date range\n';
                          }
                        } else if (report.reportType === 'payslip_history' && report.data) {
                          // Payslip History CSV
                          csvContent += 'PAYSLIP HISTORY REPORT\n\n';
                          csvContent += `Period,${report.data.period?.startDate || new Date(report.filters.startDate).toLocaleDateString()} - ${report.data.period?.endDate || new Date(report.filters.endDate).toLocaleDateString()}\n`;
                          csvContent += `Generated,${new Date(report.generatedAt).toLocaleString()}\n\n`;
                          
                          // Summary
                          if (report.data.summary) {
                            csvContent += 'SUMMARY\n';
                            csvContent += `Total Payslips,${report.data.summary.totalPayslips || 0}\n`;
                            csvContent += `Unique Employees,${report.data.summary.uniqueEmployees || 0}\n`;
                            csvContent += `Total Gross Salary,${report.data.summary.totalGrossSalary || 0}\n`;
                            csvContent += `Total Net Pay,${report.data.summary.totalNetPay || 0}\n`;
                            csvContent += `Total Deductions,${report.data.summary.totalDeductions || 0}\n\n`;
                          }
                          
                          // Payslips
                          const payslips = report.data.payslips || [];
                          if (payslips.length > 0) {
                            csvContent += 'PAYSLIPS\n';
                            csvContent += 'ID,Employee Name,Employee Code,Email,Base Salary,Total Gross,Total Deductions,Net Pay,Payment Status,Created At,Updated At\n';
                            payslips.forEach((p: any) => {
                              csvContent += `"${p.id}","${p.employeeName}","${p.employeeCode}","${p.email}",${p.baseSalary},${p.totalGrossSalary},${p.totalDeductions},${p.netPay},"${p.paymentStatus}","${p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}","${p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ''}"\n`;
                            });
                          } else {
                            csvContent += 'No payslips found for this date range\n';
                          }
                        } else {
                          // Default CSV for other reports
                          csvContent = [
                            ['Report Type', 'Period', 'Generated At'],
                            [getReportTypeLabel(report.reportType), `${new Date(report.filters.startDate).toLocaleDateString()} - ${new Date(report.filters.endDate).toLocaleDateString()}`, new Date(report.generatedAt).toLocaleString()]
                          ].map(row => row.join(',')).join('\n');
                        }
                        
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${report.reportType}-${Date.now()}.csv`;
                        link.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {summaryReports.map((report) => (
              <div key={report.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col">
                  <div className="mb-3">
                    <h3 className="font-medium text-slate-900">{report.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{report.period}</p>
                    <p className="text-sm text-slate-500 mt-2">
                      {report.employeeCount || 0} employees • ${(report.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentReport(report)}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadReport(report.id)}
                      className="flex-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Payroll Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type <span className="text-red-500">*</span></label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateForm.reportType}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, reportType: e.target.value as any, departmentId: e.target.value !== 'departmental_payroll' ? '' : prev.departmentId }))}
                >
                  <option value="payroll_summary">Payroll Summary</option>
                  <option value="tax_report">Tax Report</option>
                  <option value="payslip_history">Payslip History</option>
                  <option value="departmental_payroll">Departmental Payroll Report</option>
                </select>
              </div>
              
              {/* Show Department dropdown only for Departmental Payroll Report */}
              {generateForm.reportType === 'departmental_payroll' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={generateForm.departmentId}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, departmentId: e.target.value }))}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} {dept.code ? `(${dept.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateForm.startDate}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateForm.endDate}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
              
              {/* Date Error */}
              {dateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{dateError}</p>
                </div>
              )}
              
              {/* General Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowGenerateModal(false); setDateError(null); setError(null); }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Report Display */}
      {currentReport && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{getReportTypeLabel(currentReport.reportType)}</h2>
              <p className="text-sm text-slate-600 mt-1">
                Period: {new Date(currentReport.filters.startDate).toLocaleDateString()} - {new Date(currentReport.filters.endDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Generated
              </span>
              {currentReport.reportType === 'payroll_summary' && (
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {currentReport.filters.departmentName && (
              <div className="pb-4 border-b border-slate-200">
                <p className="text-sm text-slate-500">Department</p>
                <p className="text-base font-medium text-slate-900">{currentReport.filters.departmentName}</p>
              </div>
            )}

            {/* Report Data Display */}
            <div className="bg-slate-50 rounded-lg p-4 max-h-[600px] overflow-auto">
              {currentReport.reportType === 'tax_report' && currentReport.data ? (
                <div className="space-y-6">
                  {/* Tax Rules Section */}
                  {currentReport.data.taxRules && currentReport.data.taxRules.length > 0 ? (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-slate-900">Tax Rules ({currentReport.data.taxRules.length})</h3>
                        <button
                          onClick={() => {
                            // Download CSV with exact attributes
                            let csv = 'TAX RULES REPORT\n\n';
                            csv += `Period,${new Date(currentReport.filters.startDate).toLocaleDateString()} - ${new Date(currentReport.filters.endDate).toLocaleDateString()}\n`;
                            csv += `Generated,${new Date(currentReport.generatedAt).toLocaleString()}\n\n`;
                            
                            // Tax Rules headers
                            csv += 'TAX RULES\n';
                            csv += 'ID,Name,Description,Status,Created At,Updated At\n';
                            currentReport.data.taxRules.forEach((rule: any) => {
                              csv += `"${rule.id || rule._id || 'N/A'}","${rule.name}","${rule.description || ''}","${rule.status}","${rule.createdAt ? new Date(rule.createdAt).toLocaleString() : ''}","${rule.updatedAt ? new Date(rule.updatedAt).toLocaleString() : ''}"\n`;
                            });
                            csv += '\n';
                            
                            // Tax Components
                            csv += 'TAX COMPONENTS\n';
                            csv += 'Rule Name,Component ID,Component Name,Type,Description,Rate (%),Min Amount,Max Amount,Is Active,Created At,Updated At\n';
                            currentReport.data.taxRules.forEach((rule: any) => {
                              if (rule.taxComponents && rule.taxComponents.length > 0) {
                                rule.taxComponents.forEach((comp: any) => {
                                  csv += `"${rule.name}","${comp._id || comp.id || ''}","${comp.name}","${comp.type}","${comp.description || ''}",${comp.rate},${comp.minAmount || 0},${comp.maxAmount || 0},${comp.isActive ? 'Yes' : 'No'},"${comp.createdAt ? new Date(comp.createdAt).toLocaleString() : ''}","${comp.updatedAt ? new Date(comp.updatedAt).toLocaleString() : ''}"\n`;
                                });
                              }
                            });
                            
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `tax-report-${Date.now()}.csv`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Download CSV
                        </button>
                      </div>
                      {currentReport.data.taxRules.map((rule: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-lg text-slate-900">{rule.name}</h4>
                              <p className="text-sm text-slate-600">{rule.description}</p>
                            </div>
                            <span className={`px-3 py-1 text-sm rounded-full font-medium ${rule.status === 'active' || rule.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : rule.status === 'approved' || rule.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{rule.status}</span>
                          </div>
                          
                          {/* Rule Details */}
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3 p-2 bg-slate-50 rounded">
                            <div><span className="font-medium">ID:</span> {rule.id || rule._id}</div>
                            <div><span className="font-medium">Created:</span> {rule.createdAt ? new Date(rule.createdAt).toLocaleString() : 'N/A'}</div>
                            <div><span className="font-medium">Updated:</span> {rule.updatedAt ? new Date(rule.updatedAt).toLocaleString() : 'N/A'}</div>
                            {rule.approvedAt && <div><span className="font-medium">Approved:</span> {new Date(rule.approvedAt).toLocaleString()}</div>}
                          </div>
                          
                          {/* Tax Components */}
                          {rule.taxComponents && rule.taxComponents.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-semibold text-slate-800 mb-2">Tax Components ({rule.taxComponents.length}):</p>
                              <div className="space-y-2">
                                {rule.taxComponents.map((comp: any, cIdx: number) => (
                                  <div key={cIdx} className="bg-blue-50 p-3 rounded border border-blue-100">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-semibold text-slate-900">{comp.name}</span>
                                      <span className="text-lg font-bold text-blue-600">{comp.rate}%</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{comp.description}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                      <div className="bg-white p-1 rounded"><span className="font-medium">Type:</span> {comp.type}</div>
                                      <div className="bg-white p-1 rounded"><span className="font-medium">Min:</span> ${comp.minAmount || 0}</div>
                                      <div className="bg-white p-1 rounded"><span className="font-medium">Max:</span> ${comp.maxAmount || 0}</div>
                                      <div className="bg-white p-1 rounded"><span className="font-medium">Active:</span> {comp.isActive ? 'Yes' : 'No'}</div>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500">
                                      <span>Created: {comp.createdAt ? new Date(comp.createdAt).toLocaleString() : 'N/A'}</span>
                                      <span className="ml-4">Updated: {comp.updatedAt ? new Date(comp.updatedAt).toLocaleString() : 'N/A'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-lg">No tax rules found for this date range</p>
                      <p className="text-sm mt-2">Try selecting a different date range</p>
                    </div>
                  )}
                </div>
              ) : currentReport.reportType === 'payslip_history' && currentReport.data ? (
                <div className="space-y-6">
                  {/* Payslip History Summary */}
                  {currentReport.data.summary && (
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded">
                          <p className="text-2xl font-bold text-blue-600">{currentReport.data.summary.totalPayslips}</p>
                          <p className="text-sm text-slate-600">Total Payslips</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded">
                          <p className="text-2xl font-bold text-green-600">{currentReport.data.summary.uniqueEmployees}</p>
                          <p className="text-sm text-slate-600">Unique Employees</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded">
                          <p className="text-2xl font-bold text-purple-600">${currentReport.data.summary.totalGrossSalary?.toLocaleString()}</p>
                          <p className="text-sm text-slate-600">Total Gross</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded">
                          <p className="text-2xl font-bold text-orange-600">${currentReport.data.summary.totalNetPay?.toLocaleString()}</p>
                          <p className="text-sm text-slate-600">Total Net Pay</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Payslips List */}
                  {currentReport.data.payslips && currentReport.data.payslips.length > 0 ? (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-slate-900">Payslips ({currentReport.data.payslips.length})</h3>
                        <button
                          onClick={() => {
                            let csv = 'PAYSLIP HISTORY REPORT\n\n';
                            csv += `Period,${currentReport.data.period?.startDate} - ${currentReport.data.period?.endDate}\n`;
                            csv += `Generated,${new Date(currentReport.generatedAt).toLocaleString()}\n\n`;
                            
                            // Summary
                            csv += 'SUMMARY\n';
                            csv += `Total Payslips,${currentReport.data.summary?.totalPayslips || 0}\n`;
                            csv += `Unique Employees,${currentReport.data.summary?.uniqueEmployees || 0}\n`;
                            csv += `Total Gross Salary,${currentReport.data.summary?.totalGrossSalary || 0}\n`;
                            csv += `Total Net Pay,${currentReport.data.summary?.totalNetPay || 0}\n`;
                            csv += `Total Deductions,${currentReport.data.summary?.totalDeductions || 0}\n\n`;
                            
                            // Payslips
                            csv += 'PAYSLIPS\n';
                            csv += 'ID,Employee Name,Employee Code,Email,Base Salary,Total Gross,Total Deductions,Net Pay,Payment Status,Created At,Updated At\n';
                            currentReport.data.payslips.forEach((p: any) => {
                              csv += `"${p.id}","${p.employeeName}","${p.employeeCode}","${p.email}",${p.baseSalary},${p.totalGrossSalary},${p.totalDeductions},${p.netPay},"${p.paymentStatus}","${p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}","${p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ''}"\n`;
                            });
                            
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `payslip-history-${Date.now()}.csv`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Download CSV
                        </button>
                      </div>
                      {currentReport.data.payslips.map((payslip: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-lg text-slate-900">{payslip.employeeName}</h4>
                              <p className="text-sm text-slate-600">{payslip.employeeCode} • {payslip.email}</p>
                            </div>
                            <span className={`px-3 py-1 text-sm rounded-full font-medium ${payslip.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : payslip.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{payslip.paymentStatus}</span>
                          </div>
                          
                          {/* Payslip Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="bg-slate-50 p-2 rounded">
                              <p className="text-xs text-slate-500">Base Salary</p>
                              <p className="font-semibold text-slate-900">${payslip.baseSalary?.toLocaleString()}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-xs text-slate-500">Gross Salary</p>
                              <p className="font-semibold text-green-700">${payslip.totalGrossSalary?.toLocaleString()}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded">
                              <p className="text-xs text-slate-500">Deductions</p>
                              <p className="font-semibold text-red-700">${payslip.totalDeductions?.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                              <p className="text-xs text-slate-500">Net Pay</p>
                              <p className="font-semibold text-blue-700">${payslip.netPay?.toLocaleString()}</p>
                            </div>
                          </div>
                          
                          {/* Allowances */}
                          {payslip.allowances && payslip.allowances.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Allowances:</p>
                              <div className="flex flex-wrap gap-2">
                                {payslip.allowances.map((a: any, aIdx: number) => (
                                  <span key={aIdx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">{a.name}: ${a.amount}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Taxes */}
                          {payslip.taxes && payslip.taxes.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Taxes:</p>
                              <div className="flex flex-wrap gap-2">
                                {payslip.taxes.map((t: any, tIdx: number) => (
                                  <span key={tIdx} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">{t.name}: ${t.amount} ({t.rate}%)</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-slate-500">
                            <span>Created: {payslip.createdAt ? new Date(payslip.createdAt).toLocaleString() : 'N/A'}</span>
                            <span className="ml-4">Updated: {payslip.updatedAt ? new Date(payslip.updatedAt).toLocaleString() : 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-lg">No payslips found for this date range</p>
                      <p className="text-sm mt-2">Try selecting a different date range</p>
                    </div>
                  )}
                </div>
              ) : (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap">
                  {JSON.stringify(currentReport.data, null, 2)}
                </pre>
              )}
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
