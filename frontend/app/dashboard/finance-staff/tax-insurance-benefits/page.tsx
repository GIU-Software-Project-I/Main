'use client';

import { useState, useEffect } from 'react';
import { financeStaffService, TaxReport, InsuranceReport, BenefitsReport, PayslipHistoryReport } from '@/app/services/finance-staff';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

type ReportType = 'tax' | 'insurance' | 'benefits' | 'payslip-history' | 'payroll-summary';
type GenerateReportType = 'tax' | 'insurance' | 'benefits' | 'contributions' | 'payroll-summary' | 'payslip-history';

export default function TaxInsuranceBenefitsPage() {
  const { user } = useAuth();
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

  const [selectedTaxReport, setSelectedTaxReport] = useState<any>(null);
  const [selectedPayslipReport, setSelectedPayslipReport] = useState<any>(null);
  const [selectedInsuranceReport, setSelectedInsuranceReport] = useState<any>(null);
  const [selectedBenefitsReport, setSelectedBenefitsReport] = useState<any>(null);

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
    if (!user?.role || ![SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN].includes(user.role as SystemRole)) return;
    loadReports();
  }, [user, selectedPeriod]);

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
            // Transform the taxRules response into a report format
            const taxData = response.data;
            const newReport = {
              id: `tax_${Date.now()}`,
              title: 'Tax Rules Report',
              period: generatePeriod,
              generatedAt: new Date().toISOString(),
              taxRules: taxData.taxRules || [],
              totalEmployees: taxData.totalEmployees || 0,
              totalTaxCollected: taxData.totalTaxCollected || 0,
              reportType: taxData.reportType || 'TAX_COMPLIANCE_REPORT',
              year: taxData.year || new Date().getFullYear(),
            };
            const updatedReports = [newReport, ...taxReports];
            setTaxReports(updatedReports as any);
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

  const handleDeleteTaxReport = (reportId: string) => {
    const updatedReports = taxReports.filter((r: any) => r.id !== reportId);
    setTaxReports(updatedReports);
    localStorage.setItem('taxReports', JSON.stringify(updatedReports));
    setSelectedTaxReport(null);
  };

  const handleDeletePayslipReport = (reportId: string) => {
    const updatedReports = payslipHistoryReports.filter((r: any) => r.id !== reportId);
    setPayslipHistoryReports(updatedReports);
    localStorage.setItem('payslipHistoryReports', JSON.stringify(updatedReports));
    setSelectedPayslipReport(null);
  };

  const handleDeleteInsuranceReport = (reportId: string) => {
    const updatedReports = insuranceReports.filter((r: any) => r.id !== reportId);
    setInsuranceReports(updatedReports);
    localStorage.setItem('insuranceReports', JSON.stringify(updatedReports));
    setSelectedInsuranceReport(null);
  };

  const handleDeleteBenefitsReport = (reportId: string) => {
    const updatedReports = benefitsReports.filter((r: any) => r.id !== reportId);
    setBenefitsReports(updatedReports);
    localStorage.setItem('benefitsReports', JSON.stringify(updatedReports));
    setSelectedBenefitsReport(null);
  };

  if (!user?.role || ![SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN].includes(user.role as SystemRole)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Finance Staff role required.</p>
      </div>
    );
  }

  const renderTaxReports = () => (
    <div className="space-y-4">
      {taxReports.map((report: any) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{report.title || 'Tax Rules Report'}</h3>
              <p className="text-sm text-slate-600 mt-1">Period: {report.period}</p>
              <p className="text-xs text-slate-500">Generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'N/A'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Tax Rules</p>
                <p className="text-xl font-bold text-blue-600">{report.taxRules?.length || 0}</p>
              </div>
              <button
                onClick={() => setSelectedTaxReport(report)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
      {taxReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No tax reports found. Click "Generate Report" to create one.
        </div>
      )}
    </div>
  );

  const renderInsuranceReports = () => (
    <div className="space-y-4">
      {insuranceReports.map((report: any) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{report.title || 'Insurance Brackets Report'}</h3>
              <p className="text-sm text-slate-600 mt-1">Period: {report.period}</p>
              <p className="text-xs text-slate-500">Generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'N/A'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Insurance Brackets</p>
                <p className="text-xl font-bold text-blue-600">{report.insuranceBrackets?.length || report.insuranceTypes?.length || 0}</p>
              </div>
              <button
                onClick={() => setSelectedInsuranceReport(report)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
      {insuranceReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No insurance reports found. Click "Generate Report" to create one.
        </div>
      )}
    </div>
  );

  const renderBenefitsReports = () => (
    <div className="space-y-4">
      {benefitsReports.map((report: any) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{report.title || 'Termination & Resignation Benefits Report'}</h3>
              <p className="text-sm text-slate-600 mt-1">Period: {report.period}</p>
              <p className="text-xs text-slate-500">Generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'N/A'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Benefits</p>
                <p className="text-xl font-bold text-blue-600">{report.benefits?.length || report.benefitTypes?.length || 0}</p>
              </div>
              <button
                onClick={() => setSelectedBenefitsReport(report)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
      {benefitsReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No benefits reports found. Click "Generate Report" to create one.
        </div>
      )}
    </div>
  );

  const renderPayslipHistoryReports = () => (
    <div className="space-y-4">
      {payslipHistoryReports.map((report: any) => (
        <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">{report.title || 'Payslip History Report'}</h3>
              <p className="text-sm text-slate-600 mt-1">Period: {report.period}</p>
              <p className="text-xs text-slate-500">Generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'N/A'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Payslips</p>
                <p className="text-xl font-bold text-blue-600">{report.totalPayslips || report.payslips?.length || 0}</p>
              </div>
              <button
                onClick={() => setSelectedPayslipReport(report)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
      {payslipHistoryReports.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No payslip history reports found. Click "Generate Report" to create one.
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

      {/* Tax Report Detail Modal */}
      {selectedTaxReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedTaxReport.title || 'Tax Rules Report'}</h3>
                <p className="text-sm text-slate-600">Period: {selectedTaxReport.period}</p>
                <p className="text-xs text-slate-500">Generated: {selectedTaxReport.generatedAt ? new Date(selectedTaxReport.generatedAt).toLocaleString() : 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedTaxReport(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tax Rules Display */}
            {selectedTaxReport.taxRules && selectedTaxReport.taxRules.length > 0 ? (
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-slate-800">Tax Rules ({selectedTaxReport.taxRules.length})</h4>
                {selectedTaxReport.taxRules.map((rule: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-slate-900">{rule.name}</h5>
                        <p className="text-sm text-slate-600">{rule.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.status === 'ACTIVE' || rule.status === 'active' ? 'bg-green-100 text-green-700' : 
                        rule.status === 'APPROVED' || rule.status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                        rule.status === 'DRAFT' || rule.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {rule.status}
                      </span>
                    </div>
                    
                    {/* Rule Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                      <div><span className="font-medium">ID:</span> {rule.id || rule._id}</div>
                      <div><span className="font-medium">Created:</span> {rule.createdAt ? new Date(rule.createdAt).toLocaleString() : 'N/A'}</div>
                      <div><span className="font-medium">Updated:</span> {rule.updatedAt ? new Date(rule.updatedAt).toLocaleString() : 'N/A'}</div>
                      {rule.approvedAt && <div><span className="font-medium">Approved:</span> {new Date(rule.approvedAt).toLocaleString()}</div>}
                    </div>
                    
                    {/* Tax Components */}
                    {rule.taxComponents && rule.taxComponents.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Tax Components ({rule.taxComponents.length}):</p>
                        <div className="grid gap-2">
                          {rule.taxComponents.map((comp: any, cIdx: number) => (
                            <div key={cIdx} className="bg-white p-3 rounded border border-slate-200">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-slate-900">{comp.name}</span>
                                <span className="text-lg font-bold text-blue-600">{comp.rate}%</span>
                              </div>
                              <p className="text-xs text-slate-600 mb-2">{comp.description}</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div><span className="font-medium">Type:</span> {comp.type}</div>
                                <div><span className="font-medium">Min:</span> ${comp.minAmount || 0}</div>
                                <div><span className="font-medium">Max:</span> ${comp.maxAmount || 0}</div>
                                <div><span className="font-medium">Active:</span> {comp.isActive ? 'Yes' : 'No'}</div>
                              </div>
                              {comp.formula && (
                                <div className="mt-1 text-xs text-slate-500"><span className="font-medium">Formula:</span> {comp.formula}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 mb-6">
                No tax rules found for this period
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between border-t pt-4">
              <button
                onClick={() => handleDeleteTaxReport(selectedTaxReport.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Report
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Download CSV
                    let csv = 'TAX RULES REPORT\n\n';
                    csv += `Period,${selectedTaxReport.period}\n`;
                    csv += `Generated,${selectedTaxReport.generatedAt ? new Date(selectedTaxReport.generatedAt).toLocaleString() : 'N/A'}\n\n`;
                    
                    csv += 'TAX RULES\n';
                    csv += 'ID,Name,Description,Status,Created At,Updated At\n';
                    (selectedTaxReport.taxRules || []).forEach((rule: any) => {
                      csv += `"${rule.id || rule._id || ''}","${rule.name || ''}","${rule.description || ''}","${rule.status || ''}","${rule.createdAt ? new Date(rule.createdAt).toLocaleString() : ''}","${rule.updatedAt ? new Date(rule.updatedAt).toLocaleString() : ''}"\n`;
                    });
                    csv += '\n';
                    
                    csv += 'TAX COMPONENTS\n';
                    csv += 'Rule Name,Component Name,Type,Description,Rate (%),Min Amount,Max Amount,Is Active,Formula\n';
                    (selectedTaxReport.taxRules || []).forEach((rule: any) => {
                      if (rule.taxComponents && rule.taxComponents.length > 0) {
                        rule.taxComponents.forEach((comp: any) => {
                          csv += `"${rule.name || ''}","${comp.name || ''}","${comp.type || ''}","${comp.description || ''}",${comp.rate || 0},${comp.minAmount || 0},${comp.maxAmount || 0},${comp.isActive ? 'Yes' : 'No'},"${comp.formula || ''}"\n`;
                        });
                      }
                    });
                    
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `tax-rules-report-${Date.now()}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setSelectedTaxReport(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History Report Detail Modal */}
      {selectedPayslipReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedPayslipReport.title || 'Payslip History Report'}</h3>
                <p className="text-sm text-slate-600">Period: {selectedPayslipReport.period}</p>
                <p className="text-xs text-slate-500">Generated: {selectedPayslipReport.generatedAt ? new Date(selectedPayslipReport.generatedAt).toLocaleString() : 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedPayslipReport(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-4 gap-4 mb-6 bg-slate-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-slate-500">Total Payslips</p>
                <p className="text-xl font-bold text-slate-900">{selectedPayslipReport.totalPayslips || selectedPayslipReport.payslips?.length || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Employees</p>
                <p className="text-xl font-bold text-slate-900">{selectedPayslipReport.employeeCount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Gross Pay</p>
                <p className="text-xl font-bold text-slate-900">${(selectedPayslipReport.totalGrossPay || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Net Pay</p>
                <p className="text-xl font-bold text-green-600">${(selectedPayslipReport.totalNetPay || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Department Breakdown */}
            {selectedPayslipReport.departmentBreakdown && selectedPayslipReport.departmentBreakdown.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-slate-800 mb-3">Department Breakdown</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid gap-2">
                    {selectedPayslipReport.departmentBreakdown.map((dept: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
                        <span className="font-medium text-slate-700">{dept.departmentName}</span>
                        <div className="flex gap-6 text-sm">
                          <span className="text-slate-600">{dept.employeeCount} employees</span>
                          <span className="text-green-600 font-semibold">${(dept.totalNetPay || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payslips Detail */}
            {selectedPayslipReport.payslips && selectedPayslipReport.payslips.length > 0 ? (
              <div className="mb-6">
                <h4 className="font-medium text-slate-800 mb-3">Payslips ({selectedPayslipReport.payslips.length})</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedPayslipReport.payslips.map((payslip: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-semibold text-slate-900">
                            {payslip.employeeName || payslip.employeeId?.firstName + ' ' + payslip.employeeId?.lastName || `Employee ${payslip.employeeId}`}
                          </h5>
                          <p className="text-sm text-slate-600">{payslip.employeeId?.email || ''}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          payslip.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                          payslip.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {payslip.paymentStatus || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Gross Salary:</span>
                          <span className="ml-2 font-semibold text-slate-900">${(payslip.totalGrossSalary || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Deductions:</span>
                          <span className="ml-2 font-semibold text-red-600">${(payslip.totaDeductions || payslip.totalDeductions || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Net Pay:</span>
                          <span className="ml-2 font-semibold text-green-600">${(payslip.netPay || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Earnings Details */}
                      {payslip.earningsDetails && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-medium text-slate-700 mb-2">Earnings:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-slate-500">Base Salary:</span> ${(payslip.earningsDetails.baseSalary || 0).toLocaleString()}</div>
                            {payslip.earningsDetails.allowances?.length > 0 && (
                              <div><span className="text-slate-500">Allowances:</span> {payslip.earningsDetails.allowances.length} items</div>
                            )}
                            {payslip.earningsDetails.bonuses?.length > 0 && (
                              <div><span className="text-slate-500">Bonuses:</span> {payslip.earningsDetails.bonuses.length} items</div>
                            )}
                            {payslip.earningsDetails.benefits?.length > 0 && (
                              <div><span className="text-slate-500">Benefits:</span> {payslip.earningsDetails.benefits.length} items</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Deductions Details */}
                      {payslip.deductionsDetails && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs font-medium text-slate-700 mb-2">Deductions:</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><span className="text-slate-500">Tax:</span> ${(payslip.deductionsDetails.taxAmount || 0).toLocaleString()}</div>
                            <div><span className="text-slate-500">Insurance:</span> ${(payslip.deductionsDetails.insuranceAmount || 0).toLocaleString()}</div>
                            <div><span className="text-slate-500">Penalties:</span> ${(payslip.deductionsDetails.penaltiesAmount || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 mb-6">
                No payslips found for this period
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between border-t pt-4">
              <button
                onClick={() => handleDeletePayslipReport(selectedPayslipReport.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Report
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Download CSV
                    let csv = 'PAYSLIP HISTORY REPORT\n\n';
                    csv += `Period,${selectedPayslipReport.period}\n`;
                    csv += `Generated,${selectedPayslipReport.generatedAt ? new Date(selectedPayslipReport.generatedAt).toLocaleString() : 'N/A'}\n`;
                    csv += `Total Payslips,${selectedPayslipReport.totalPayslips || 0}\n`;
                    csv += `Total Employees,${selectedPayslipReport.employeeCount || 0}\n`;
                    csv += `Total Gross Pay,$${(selectedPayslipReport.totalGrossPay || 0).toLocaleString()}\n`;
                    csv += `Total Net Pay,$${(selectedPayslipReport.totalNetPay || 0).toLocaleString()}\n\n`;
                    
                    if (selectedPayslipReport.departmentBreakdown?.length > 0) {
                      csv += 'DEPARTMENT BREAKDOWN\n';
                      csv += 'Department,Employees,Total Net Pay\n';
                      selectedPayslipReport.departmentBreakdown.forEach((dept: any) => {
                        csv += `"${dept.departmentName}",${dept.employeeCount},$${(dept.totalNetPay || 0).toLocaleString()}\n`;
                      });
                      csv += '\n';
                    }
                    
                    csv += 'PAYSLIPS\n';
                    csv += 'Employee ID,Employee Name,Email,Gross Salary,Deductions,Net Pay,Status\n';
                    (selectedPayslipReport.payslips || []).forEach((p: any) => {
                      const empName = p.employeeName || (p.employeeId?.firstName ? p.employeeId.firstName + ' ' + p.employeeId.lastName : 'N/A');
                      csv += `"${p.employeeId?._id || p.employeeId || ''}","${empName}","${p.employeeId?.email || ''}",${p.totalGrossSalary || 0},${p.totaDeductions || p.totalDeductions || 0},${p.netPay || 0},"${p.paymentStatus || ''}"\n`;
                    });
                    
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `payslip-history-report-${Date.now()}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setSelectedPayslipReport(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insurance Report Detail Modal */}
      {selectedInsuranceReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedInsuranceReport.title || 'Insurance Brackets Report'}</h3>
                <p className="text-sm text-slate-600">Period: {selectedInsuranceReport.period}</p>
                <p className="text-xs text-slate-500">Generated: {selectedInsuranceReport.generatedAt ? new Date(selectedInsuranceReport.generatedAt).toLocaleString() : 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedInsuranceReport(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Insurance Brackets Display */}
            {selectedInsuranceReport.insuranceBrackets && selectedInsuranceReport.insuranceBrackets.length > 0 ? (
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-slate-800">Insurance Brackets ({selectedInsuranceReport.insuranceBrackets.length})</h4>
                {selectedInsuranceReport.insuranceBrackets.map((bracket: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-slate-900">{bracket.name}</h5>
                        <p className="text-sm text-slate-600">Amount: ${(bracket.amount || 0).toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        bracket.status === 'APPROVED' || bracket.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        bracket.status === 'ACTIVE' || bracket.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                        bracket.status === 'DRAFT' || bracket.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {bracket.status}
                      </span>
                    </div>
                    
                    {/* Bracket Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-xs text-slate-500">Min Salary</p>
                        <p className="font-semibold text-slate-900">${(bracket.minSalary || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-xs text-slate-500">Max Salary</p>
                        <p className="font-semibold text-slate-900">${(bracket.maxSalary || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-xs text-slate-500">Employee Rate</p>
                        <p className="font-semibold text-blue-600">{bracket.employeeRate || 0}%</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-xs text-slate-500">Employer Rate</p>
                        <p className="font-semibold text-green-600">{bracket.employerRate || 0}%</p>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                      <div><span className="font-medium">ID:</span> {bracket.id || bracket._id}</div>
                      <div><span className="font-medium">Created:</span> {bracket.createdAt ? new Date(bracket.createdAt).toLocaleString() : 'N/A'}</div>
                      <div><span className="font-medium">Updated:</span> {bracket.updatedAt ? new Date(bracket.updatedAt).toLocaleString() : 'N/A'}</div>
                      {bracket.approvedAt && <div><span className="font-medium">Approved:</span> {new Date(bracket.approvedAt).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 mb-6">
                No insurance brackets found for this period
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between border-t pt-4">
              <button
                onClick={() => handleDeleteInsuranceReport(selectedInsuranceReport.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Report
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Download CSV
                    let csv = 'INSURANCE BRACKETS REPORT\n\n';
                    csv += `Period,${selectedInsuranceReport.period}\n`;
                    csv += `Generated,${selectedInsuranceReport.generatedAt ? new Date(selectedInsuranceReport.generatedAt).toLocaleString() : 'N/A'}\n\n`;
                    
                    csv += 'INSURANCE BRACKETS\n';
                    csv += 'ID,Name,Amount,Status,Min Salary,Max Salary,Employee Rate (%),Employer Rate (%),Created At,Updated At,Approved At\n';
                    (selectedInsuranceReport.insuranceBrackets || []).forEach((bracket: any) => {
                      csv += `"${bracket.id || bracket._id || ''}","${bracket.name || ''}",${bracket.amount || 0},"${bracket.status || ''}",${bracket.minSalary || 0},${bracket.maxSalary || 0},${bracket.employeeRate || 0},${bracket.employerRate || 0},"${bracket.createdAt ? new Date(bracket.createdAt).toLocaleString() : ''}","${bracket.updatedAt ? new Date(bracket.updatedAt).toLocaleString() : ''}","${bracket.approvedAt ? new Date(bracket.approvedAt).toLocaleString() : ''}"\n`;
                    });
                    
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `insurance-brackets-report-${Date.now()}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setSelectedInsuranceReport(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Report Detail Modal */}
      {selectedBenefitsReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedBenefitsReport.title || 'Termination & Resignation Benefits Report'}</h3>
                <p className="text-sm text-slate-600">Period: {selectedBenefitsReport.period}</p>
                <p className="text-xs text-slate-500">Generated: {selectedBenefitsReport.generatedAt ? new Date(selectedBenefitsReport.generatedAt).toLocaleString() : 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedBenefitsReport(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-500">Total Benefits</p>
                <p className="text-2xl font-bold text-green-600">${(selectedBenefitsReport.totalBenefits || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Number of Benefit Types</p>
                <p className="text-2xl font-bold text-blue-600">{selectedBenefitsReport.benefits?.length || selectedBenefitsReport.benefitTypes?.length || 0}</p>
              </div>
            </div>

            {/* Benefits Display */}
            {(selectedBenefitsReport.benefits || selectedBenefitsReport.benefitTypes) && (selectedBenefitsReport.benefits || selectedBenefitsReport.benefitTypes).length > 0 ? (
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-slate-800">Benefits ({(selectedBenefitsReport.benefits || selectedBenefitsReport.benefitTypes).length})</h4>
                {(selectedBenefitsReport.benefits || selectedBenefitsReport.benefitTypes).map((benefit: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-slate-900">{benefit.name || benefit.benefitType}</h5>
                        <p className="text-sm text-slate-600">Amount: ${(benefit.amount || 0).toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        benefit.status === 'APPROVED' || benefit.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        benefit.status === 'ACTIVE' || benefit.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                        benefit.status === 'DRAFT' || benefit.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {benefit.status || 'N/A'}
                      </span>
                    </div>
                    
                    {/* Benefit Details */}
                    {benefit.terms && (
                      <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                        <p className="text-xs text-slate-500">Terms</p>
                        <p className="text-sm text-slate-700">{benefit.terms}</p>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                      <div><span className="font-medium">ID:</span> {benefit.id || benefit._id}</div>
                      <div><span className="font-medium">Created:</span> {benefit.createdAt ? new Date(benefit.createdAt).toLocaleString() : 'N/A'}</div>
                      <div><span className="font-medium">Updated:</span> {benefit.updatedAt ? new Date(benefit.updatedAt).toLocaleString() : 'N/A'}</div>
                      {benefit.approvedAt && <div><span className="font-medium">Approved:</span> {new Date(benefit.approvedAt).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 mb-6">
                No benefits found for this period
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between border-t pt-4">
              <button
                onClick={() => handleDeleteBenefitsReport(selectedBenefitsReport.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Report
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Download CSV
                    let csv = 'TERMINATION & RESIGNATION BENEFITS REPORT\n\n';
                    csv += `Period,${selectedBenefitsReport.period}\n`;
                    csv += `Generated,${selectedBenefitsReport.generatedAt ? new Date(selectedBenefitsReport.generatedAt).toLocaleString() : 'N/A'}\n`;
                    csv += `Total Benefits,$${(selectedBenefitsReport.totalBenefits || 0).toLocaleString()}\n\n`;
                    
                    csv += 'BENEFITS\n';
                    csv += 'ID,Name,Amount,Status,Terms,Created At,Updated At,Approved At\n';
                    (selectedBenefitsReport.benefits || selectedBenefitsReport.benefitTypes || []).forEach((benefit: any) => {
                      csv += `"${benefit.id || benefit._id || ''}","${benefit.name || benefit.benefitType || ''}",${benefit.amount || 0},"${benefit.status || ''}","${benefit.terms || ''}","${benefit.createdAt ? new Date(benefit.createdAt).toLocaleString() : ''}","${benefit.updatedAt ? new Date(benefit.updatedAt).toLocaleString() : ''}","${benefit.approvedAt ? new Date(benefit.approvedAt).toLocaleString() : ''}"\n`;
                    });
                    
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `benefits-report-${Date.now()}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setSelectedBenefitsReport(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
