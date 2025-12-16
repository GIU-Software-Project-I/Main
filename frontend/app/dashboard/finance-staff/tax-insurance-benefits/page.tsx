'use client';

import { useState, useEffect } from 'react';
import { financeStaffService, TaxReport, InsuranceReport, BenefitsReport, PayslipHistoryReport } from '@/app/services/finance-staff';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

type ReportType = 'tax' | 'insurance' | 'benefits' | 'payslip-history' | 'payroll-summary';
type GenerateReportType = 'tax' | 'insurance' | 'benefits' | 'contributions' | 'payroll-summary' | 'payslip-history';

export default function TaxInsuranceBenefitsPage() {
  const { hasRole } = useAuth();
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [insuranceReports, setInsuranceReports] = useState<InsuranceReport[]>([]);
  const [benefitsReports, setBenefitsReports] = useState<BenefitsReport[]>([]);
  const [payslipHistoryReports, setPayslipHistoryReports] = useState<PayslipHistoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tax' | 'insurance' | 'benefits' | 'payslip-history'>('tax');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateReportType, setGenerateReportType] = useState<GenerateReportType>('tax');
  const [generatePeriod, setGeneratePeriod] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTaxReports = localStorage.getItem('taxReports');
    const savedInsuranceReports = localStorage.getItem('insuranceReports');
    const savedBenefitsReports = localStorage.getItem('benefitsReports');
    const savedPayslipHistory = localStorage.getItem('payslipHistoryReports');
    
    if (savedTaxReports) {
      try { setTaxReports(JSON.parse(savedTaxReports)); } catch (e) { console.error('Failed to parse tax reports:', e); }
    }
    if (savedInsuranceReports) {
      try { setInsuranceReports(JSON.parse(savedInsuranceReports)); } catch (e) { console.error('Failed to parse insurance reports:', e); }
    }
    if (savedBenefitsReports) {
      try { setBenefitsReports(JSON.parse(savedBenefitsReports)); } catch (e) { console.error('Failed to parse benefits reports:', e); }
    }
    if (savedPayslipHistory) {
      try { setPayslipHistoryReports(JSON.parse(savedPayslipHistory)); } catch (e) { console.error('Failed to parse payslip history:', e); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hasRole([SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN])) return;
    loadReports();
  }, [hasRole, selectedPeriod]);

  const loadReports = async () => {
    setLoading(true);
    try {
      console.log('Loading reports for period:', selectedPeriod);
      const [taxResponse, insuranceResponse, benefitsResponse, payslipResponse]: [
        { data?: TaxReport[] } | undefined,
        { data?: InsuranceReport[] } | undefined,
        { data?: BenefitsReport[] } | undefined,
        { data?: PayslipHistoryReport[] } | undefined
      ] = await Promise.all([
        financeStaffService.getTaxReports(selectedPeriod),
        financeStaffService.getInsuranceReports(selectedPeriod),
        financeStaffService.getBenefitsReports(selectedPeriod),
        financeStaffService.getPayslipHistory(selectedPeriod),
      ]);
      
      console.log('Tax reports response:', taxResponse);
      console.log('Insurance reports response:', insuranceResponse);
      console.log('Benefits reports response:', benefitsResponse);
      
      if (taxResponse?.data) {
        console.log('Setting tax reports:', taxResponse.data);
        setTaxReports(taxResponse.data);
        localStorage.setItem('taxReports', JSON.stringify(taxResponse.data));
      } else {
        console.log('No tax reports data found');
        // Keep localStorage data if API returns empty
      }
      
      if (insuranceResponse?.data) {
        console.log('Setting insurance reports:', insuranceResponse.data);
        setInsuranceReports(insuranceResponse.data);
        localStorage.setItem('insuranceReports', JSON.stringify(insuranceResponse.data));
      } else {
        console.log('No insurance reports data found');
        // Keep localStorage data if API returns empty
      }
      
      if (benefitsResponse?.data) {
        console.log('Setting benefits reports:', benefitsResponse.data);
        setBenefitsReports(benefitsResponse.data);
        localStorage.setItem('benefitsReports', JSON.stringify(benefitsResponse.data));
      } else {
        console.log('No benefits reports data found');
        // Keep localStorage data if API returns empty
      }
      
      if (payslipResponse?.data) {
        console.log('Setting payslip history reports:', payslipResponse.data);
        setPayslipHistoryReports(payslipResponse.data);
        localStorage.setItem('payslipHistoryReports', JSON.stringify(payslipResponse.data));
      } else {
        console.log('No payslip history data found');
        // Keep localStorage data if API returns empty
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      setError('Failed to load reports. Please check if the backend services are running.');
      // Set empty arrays on error to prevent undefined states
      setTaxReports([]);
      setInsuranceReports([]);
      setBenefitsReports([]);
      setPayslipHistoryReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!generatePeriod) {
      setError('Period is required for report generation');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Generating report:', { type: generateReportType, period: generatePeriod });
      let response: any;
      switch (generateReportType) {
        case 'tax':
          response = await financeStaffService.generateTaxReport(generatePeriod);
          console.log('Tax report response:', response);
          if (response?.data) {
            const newReport = response.data as TaxReport;
            const updatedReports = [newReport, ...taxReports];
            setTaxReports(updatedReports);
            localStorage.setItem('taxReports', JSON.stringify(updatedReports));
            console.log('Tax report added:', newReport);
            setSuccessMessage('Tax report generated successfully');
          } else {
            setError('No data received from server');
          }
          break;
        case 'insurance':
          response = await financeStaffService.generateInsuranceReport(generatePeriod);
          console.log('Insurance report response:', response);
          if (response?.data) {
            const newReport = response.data as InsuranceReport;
            const updatedReports = [newReport, ...insuranceReports];
            setInsuranceReports(updatedReports);
            localStorage.setItem('insuranceReports', JSON.stringify(updatedReports));
            console.log('Insurance report added:', newReport);
            setSuccessMessage('Insurance report generated successfully');
          } else {
            setError('No data received from server');
          }
          break;
        case 'benefits':
          response = await financeStaffService.generateBenefitsReport(generatePeriod);
          console.log('Benefits report response:', response);
          if (response?.data) {
            const newReport = response.data as BenefitsReport;
            const updatedReports = [newReport, ...benefitsReports];
            setBenefitsReports(updatedReports);
            localStorage.setItem('benefitsReports', JSON.stringify(updatedReports));
            console.log('Benefits report added:', newReport);
            setSuccessMessage('Benefits report generated successfully');
          } else {
            setError('No data received from server');
          }
          break;
        case 'contributions':
          response = await financeStaffService.generateInsuranceReport(generatePeriod);
          console.log('Contributions report response:', response);
          if (response?.data) {
            const newReport = response.data as InsuranceReport;
            const updatedReports = [newReport, ...insuranceReports];
            setInsuranceReports(updatedReports);
            localStorage.setItem('insuranceReports', JSON.stringify(updatedReports));
            console.log('Contributions report added:', newReport);
            setSuccessMessage('Employer/Employee contributions report generated successfully');
          } else {
            setError('No data received from server');
          }
          break;
        case 'payroll-summary':
          response = await financeStaffService.generatePayrollSummary({ reportType: 'monthly', startDate: generatePeriod, endDate: generatePeriod });
          console.log('Payroll summary response:', response);
          if (response?.data) {
            setSuccessMessage('Payroll summary generated successfully. Check Payroll Summaries page.');
          } else {
            setError('No data received from server');
          }
          break;
        case 'payslip-history':
          response = await financeStaffService.generatePayslipHistoryReport(generatePeriod);
          console.log('Payslip history response:', response);
          if (response?.data) {
            const newReport = response.data as PayslipHistoryReport;
            const updatedReports = [newReport, ...payslipHistoryReports];
            setPayslipHistoryReports(updatedReports);
            localStorage.setItem('payslipHistoryReports', JSON.stringify(updatedReports));
            console.log('Payslip history report added:', newReport);
            setSuccessMessage('Payslip history report generated successfully');
          } else {
            setError('No data received from server');
          }
          break;
      }
      setShowGenerateModal(false);
      setGeneratePeriod('');
    } catch (error) {
      console.error('Failed to generate report:', error);
      setError('Failed to generate report. Backend services may not be available.');
      setShowGenerateModal(false);
      setGeneratePeriod('');
    }
  };

  const handleDownloadReport = async (reportId: string, type: ReportType) => {
    try {
      const response = await financeStaffService.downloadReport(reportId, type);
      if (response.data) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}-report-${reportId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  if (!hasRole([SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN])) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Finance Staff role required.</p>
      </div>
    );
  }

  const renderTaxReports = () => (
    <div className="space-y-4">
      {taxReports.map((report) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{report.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{report.period}</p>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Tax Withheld</p>
                  <p className="text-lg font-semibold text-slate-900">${report.totalTaxWithheld.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employees</p>
                  <p className="text-lg font-semibold text-slate-900">{report.employeeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === 'final' ? 'bg-green-100 text-green-800' :
                    report.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {report.taxTypes.map((taxType, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-slate-600">{taxType.taxType}</span>
                    <span className="text-slate-900">${taxType.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownloadReport(report.id, 'tax')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ))}
      {taxReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No tax reports found
        </div>
      )}
    </div>
  );

  const renderInsuranceReports = () => (
    <div className="space-y-4">
      {insuranceReports.map((report) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{report.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{report.period}</p>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Contributions</p>
                  <p className="text-lg font-semibold text-slate-900">${report.totalContributions.toLocaleString()}</p>
                </div>
                {report.totalEmployeeContributions !== undefined && (
                  <div>
                    <p className="text-xs text-slate-500">Employee Contributions</p>
                    <p className="text-lg font-semibold text-blue-600">${report.totalEmployeeContributions.toLocaleString()}</p>
                  </div>
                )}
                {report.totalEmployerContributions !== undefined && (
                  <div>
                    <p className="text-xs text-slate-500">Employer Contributions</p>
                    <p className="text-lg font-semibold text-green-600">${report.totalEmployerContributions.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Employees</p>
                  <p className="text-lg font-semibold text-slate-900">{report.employeeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === 'final' ? 'bg-green-100 text-green-800' :
                    report.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {report.insuranceTypes.map((insuranceType, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-700">{insuranceType.insuranceType}</span>
                      <span className="text-slate-900">${insuranceType.amount.toLocaleString()}</span>
                    </div>
                    {(insuranceType.employeeContribution !== undefined || insuranceType.employerContribution !== undefined) && (
                      <div className="ml-4 flex justify-between text-xs text-slate-500">
                        {insuranceType.employeeContribution !== undefined && (
                          <span>Employee: ${insuranceType.employeeContribution.toLocaleString()}</span>
                        )}
                        {insuranceType.employerContribution !== undefined && (
                          <span>Employer: ${insuranceType.employerContribution.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownloadReport(report.id, 'insurance')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ))}
      {insuranceReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No insurance reports found
        </div>
      )}
    </div>
  );

  const renderBenefitsReports = () => (
    <div className="space-y-4">
      {benefitsReports.map((report) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{report.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{report.period}</p>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Benefits</p>
                  <p className="text-lg font-semibold text-slate-900">${report.totalBenefits.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employees</p>
                  <p className="text-lg font-semibold text-slate-900">{report.employeeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === 'final' ? 'bg-green-100 text-green-800' :
                    report.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {report.benefitTypes.map((benefitType, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-slate-600">{benefitType.benefitType}</span>
                    <span className="text-slate-900">${benefitType.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownloadReport(report.id, 'benefits')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ))}
      {benefitsReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No benefits reports found
        </div>
      )}
    </div>
  );

  const renderPayslipHistoryReports = () => (
    <div className="space-y-4">
      {payslipHistoryReports.map((report) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">{report.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{report.period}</p>
              <div className="mt-2 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Payslips</p>
                  <p className="text-lg font-semibold text-slate-900">{report.totalPayslips}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employees</p>
                  <p className="text-lg font-semibold text-slate-900">{report.employeeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Gross Pay</p>
                  <p className="text-lg font-semibold text-slate-900">${report.totalGrossPay.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Net Pay</p>
                  <p className="text-lg font-semibold text-green-600">${report.totalNetPay.toLocaleString()}</p>
                </div>
              </div>
              {report.departmentBreakdown && report.departmentBreakdown.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2">Department Breakdown</p>
                  <div className="space-y-1">
                    {report.departmentBreakdown.map((dept, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-slate-600">{dept.departmentName}</span>
                        <span className="text-slate-900">{dept.employeeCount} employees - ${dept.totalNetPay.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownloadReport(report.id, 'payslip-history')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ))}
      {payslipHistoryReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No payslip history reports found
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax, Insurance, and Benefits Reports</h1>
          <p className="text-slate-600 mt-1">Generate and download compliance reports for accounting books</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Report
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {/* Period Filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-slate-700">Period:</label>
          <input
            type="month"
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          />
          <button
            onClick={loadReports}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'tax', label: 'Tax Reports', count: taxReports.length },
              { id: 'insurance', label: 'Insurance Reports', count: insuranceReports.length },
              { id: 'benefits', label: 'Benefits Reports', count: benefitsReports.length },
              { id: 'payslip-history', label: 'Payslip History', count: payslipHistoryReports.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-500 mt-2">Loading reports...</p>
            </div>
          ) : (
            <>
              {activeTab === 'tax' && renderTaxReports()}
              {activeTab === 'insurance' && renderInsuranceReports()}
              {activeTab === 'benefits' && renderBenefitsReports()}
              {activeTab === 'payslip-history' && renderPayslipHistoryReports()}
            </>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generateReportType}
                  onChange={(e) => setGenerateReportType(e.target.value as GenerateReportType)}
                >
                  <option value="tax">Tax Report</option>
                  <option value="insurance">Insurance Report</option>
                  <option value="benefits">Benefits Report</option>
                  <option value="payroll-summary">Payroll Summary</option>
                  <option value="payslip-history">Payslip History</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                <input
                  type="month"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generatePeriod}
                  onChange={(e) => setGeneratePeriod(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGeneratePeriod('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={!generatePeriod}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
