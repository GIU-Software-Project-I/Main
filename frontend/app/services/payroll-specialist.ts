import api from './api';

// Types for Departmental Data
export interface Department {
  id: string;
  name: string;
  code?: string;
  costCenter?: string;
}

// Types for Departmental Payroll Reports
export interface DepartmentalReport {
  id: string;
  departmentId: string;
  departmentName: string;
  period: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalTaxes: number;
  averageSalary: number;
  costCenter: string;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
}

export interface ReportFilters {
  departmentId?: string;
  period?: string;
  periodType?: 'monthly' | 'quarterly' | 'yearly';
  reportType?: 'summary' | 'tax' | 'payslip';
  startDate?: string;
  endDate?: string;
  status?: 'draft' | 'final' | 'archived';
  costCenter?: string;
}

// Standard Payroll Summary Report
export interface StandardPayrollSummary {
  departmentId: string;
  departmentName: string;
  costCenter: string;
  period: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNetPay: number;
  averageSalary: number;
  breakdown: {
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    otherAllowances: number;
    taxDeductions: number;
    pensionDeductions: number;
    otherDeductions: number;
  };
  generatedAt: string;
}

// Tax Report
export interface TaxReport {
  departmentId: string;
  departmentName: string;
  costCenter: string;
  period: string;
  totalTaxDeducted: number;
  employeesTaxBreakdown: Array<{
    employeeId: string;
    employeeName: string;
    grossPay: number;
    taxableIncome: number;
    taxAmount: number;
    taxBracket: string;
  }>;
  taxBrackets: Array<{
    bracket: string;
    minIncome: number;
    maxIncome: number;
    rate: number;
    employeeCount: number;
    totalTax: number;
  }>;
  generatedAt: string;
}

// Pay Slip History Report
export interface PaySlipHistoryReport {
  departmentId: string;
  departmentName: string;
  costCenter: string;
  period: string;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  paySlips: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    grossPay: number;
    netPay: number;
    payDate: string;
    status: 'approved' | 'pending' | 'rejected';
  }>;
  generatedAt: string;
}

// Combined Report Response
export interface DepartmentalReportResponse {
  reportType: 'summary' | 'tax' | 'payslip';
  data: StandardPayrollSummary | TaxReport | PaySlipHistoryReport;
  metadata: {
    generatedAt: string;
    generatedBy: string;
    totalRecords: number;
    exportFormats: Array<'pdf' | 'excel'>;
  };
}

export interface PayrollSummaryReport {
  id: string;
  type: 'summary' | 'tax' | 'payslip_history';
  title: string;
  period: string;
  totalAmount: number;
  employeeCount: number;
  generatedAt: string;
  downloadUrl?: string;
}

// Types for Dispute Review
export interface PayrollDispute {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  type: 'salary' | 'deduction' | 'hours' | 'other';
  description: string;
  amount?: number;
  period: string;
  status: 'pending_review' | 'under_review' | 'approved_by_specialist' | 'rejected' | 'escalated';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  rejectionRemarks?: string;
  attachments?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  eligibleForEscalation?: boolean;
}

export interface DisputeReviewAction {
  disputeId: string;
  action: 'approve' | 'reject';
  notes?: string;
  escalateToManager?: boolean;
  rejectionRemarks?: string;
}

export interface DisputeFilters {
  status?: PayrollDispute['status'] | 'all';
  period?: string;
  department?: string;
  type?: PayrollDispute['type'] | 'all';
  priority?: PayrollDispute['priority'] | 'all';
}

// Types for Expense Claims
export interface ExpenseClaim {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  title: string;
  description: string;
  amount: number;
  category: 'travel' | 'meals' | 'supplies' | 'training' | 'other';
  submittedAt: string;
  period: string;
  status: 'pending_review' | 'under_review' | 'approved_by_specialist' | 'rejected' | 'escalated';
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  rejectionRemarks?: string;
  receipts: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  eligibleForEscalation?: boolean;
}

export interface ClaimReviewAction {
  claimId: string;
  action: 'approve' | 'reject';
  notes?: string;
  escalateToManager?: boolean;
  rejectionRemarks?: string;
}

export interface ClaimFilters {
  status?: ExpenseClaim['status'] | 'all';
  period?: string;
  department?: string;
  category?: ExpenseClaim['category'] | 'all';
  priority?: ExpenseClaim['priority'] | 'all';
}

// API Service Functions
export const payrollSpecialistService = {
  // Departmental Reports
  async getDepartmentalReports(filters?: ReportFilters) {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.periodType) params.append('periodType', filters.periodType);
    if (filters?.reportType) params.append('reportType', filters.reportType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.costCenter) params.append('costCenter', filters.costCenter);

    const response = await api.get<DepartmentalReport[]>(`/payroll/reports/departmental?${params}`);
    return response;
  },

  async generateStandardPayrollSummary(filters: ReportFilters) {
    const response = await api.post<StandardPayrollSummary>('/payroll/reports/summary/generate', filters);
    return response;
  },

  async generateTaxReport(filters: ReportFilters) {
    const response = await api.post<TaxReport>('/payroll/reports/tax/generate', filters);
    return response;
  },

  async generatePaySlipHistoryReport(filters: ReportFilters) {
    const response = await api.post<PaySlipHistoryReport>('/payroll/reports/payslip/generate', filters);
    return response;
  },

  async generateDepartmentalReport(reportData: {
    reportType?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.post<DepartmentalReport>('/payroll/tracking/reports/departmental/generate', reportData);
    return response;
  },

  async exportReport(reportId: string, format: 'pdf' | 'excel') {
    const response = await api.get<Blob>(`/payroll/reports/${reportId}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response;
  },

  async getPayrollSummaryReports() {
    const response = await api.get<PayrollSummaryReport[]>('/payroll/reports/summary');
    return response;
  },

  async downloadReport(reportId: string) {
    const response = await api.get<Blob>(`/payroll/reports/${reportId}/download`);
    return response;
  },

  // Dispute Management
  async getPendingDisputes() {
    const response = await api.get<PayrollDispute[]>('/payroll/disputes/pending');
    return response;
  },

  async getAllDisputes(filters?: DisputeFilters) {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    
    const queryString = params.toString();
    const response = await api.get<any>(`/payroll/tracking/disputes${queryString ? `?${queryString}` : ''}`);
    
    // Handle nested response format
    if ((response.data as any).data) {
      return {
        success: (response.data as any).success,
        data: (response.data as any).data,
        count: (response.data as any).count
      };
    }
    
    return response;
  },

  async reviewDispute(action: DisputeReviewAction) {
    const response = await api.post<PayrollDispute>('/payroll/disputes/review', action);
    return response;
  },

  async getDisputeDetails(disputeId: string) {
    const response = await api.get<PayrollDispute>(`/payroll/disputes/${disputeId}`);
    return response;
  },

  async approveDispute(disputeId: string, escalateToManager: boolean = false, notes?: string) {
    const response = await api.put<PayrollDispute>(
      `/payroll/tracking/disputes/${disputeId}/review?action=approve&specialistId=temp`,
      { reason: notes }
    );
    return response;
  },

  async rejectDispute(disputeId: string, rejectionRemarks?: string) {
    const response = await api.put<PayrollDispute>(
      `/payroll/tracking/disputes/${disputeId}/review?action=reject&specialistId=temp`,
      { reason: rejectionRemarks }
    );
    return response;
  },

  // Expense Claims Management
  async getPendingClaims() {
    const response = await api.get<ExpenseClaim[]>('/payroll/claims/pending');
    return response;
  },

  async getAllClaims(filters?: ClaimFilters) {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    
    const queryString = params.toString();
    const response = await api.get<ExpenseClaim[]>(`/payroll/claims${queryString ? `?${queryString}` : ''}`);
    return response;
  },

  async reviewClaim(action: ClaimReviewAction) {
    const response = await api.post<ExpenseClaim>('/payroll/claims/review', action);
    return response;
  },

  async getClaimDetails(claimId: string) {
    const response = await api.get<ExpenseClaim>(`/payroll/claims/${claimId}`);
    return response;
  },

  async approveClaim(claimId: string, escalateToManager: boolean = false, notes?: string) {
    const response = await api.post<ExpenseClaim>(`/payroll/claims/${claimId}/approve`, {
      escalateToManager,
      notes
    });
    return response;
  },

  async rejectClaim(claimId: string, rejectionRemarks?: string) {
    const response = await api.post<ExpenseClaim>(`/payroll/claims/${claimId}/reject`, {
      rejectionRemarks
    });
    return response;
  },

  // Department Management
  getDepartments() {
    return api.get<Department[]>('/payroll/departments');
  },
};
