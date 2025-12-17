import api from './api';

// Types for Month-End and Year-End Payroll Summaries
export interface PayrollSummary {
  id: string;
  type: 'month_end' | 'year_end';
  period: string;
  title: string;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalTaxes: number;
  employeeCount: number;
  departmentBreakdown: DepartmentBreakdown[];
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
}

export interface DepartmentBreakdown {
  departmentName: string;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
}

export interface SummaryFilters {
  type?: 'month_end' | 'year_end';
  period?: string;
  status?: 'draft' | 'final' | 'archived';
  departmentId?: string;
}

// Types for Tax, Insurance, and Benefits Reports
export interface TaxReport {
  id: string;
  period: string;
  title: string;
  totalTaxWithheld: number;
  taxTypes: TaxTypeBreakdown[];
  employeeCount: number;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
}

export interface TaxTypeBreakdown {
  taxType: string;
  amount: number;
  employeeCount: number;
}

export interface InsuranceReport {
  id: string;
  period: string;
  title: string;
  totalContributions: number;
  totalEmployeeContributions?: number;
  totalEmployerContributions?: number;
  insuranceTypes: InsuranceTypeBreakdown[];
  employeeCount: number;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
}

export interface InsuranceTypeBreakdown {
  insuranceType: string;
  amount: number;
  employeeContribution?: number;
  employerContribution?: number;
  employeeCount: number;
}

export interface BenefitsReport {
  id: string;
  period: string;
  title: string;
  totalBenefits: number;
  benefitTypes: BenefitTypeBreakdown[];
  employeeCount: number;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
}

export interface BenefitTypeBreakdown {
  benefitType: string;
  amount: number;
  employeeCount: number;
}

export interface PayslipHistoryReport {
  id: string;
  period: string;
  title: string;
  totalPayslips: number;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  departmentBreakdown: DepartmentBreakdown[];
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
}

// Types for Approved Disputes and Claims Notifications
export interface ApprovedDispute {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  type: string;
  description: string;
  amount: number;
  period: string;
  approvedAt: string;
  approvedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  refundStatus: 'pending' | 'processed' | 'paid';
  refundId?: string;
  needsRefund: boolean;
}

export interface ApprovedClaim {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  period: string;
  approvedAt: string;
  approvedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  refundStatus: 'pending' | 'processed' | 'paid';
  refundId?: string;
  needsRefund: boolean;
}

// Types for Refund Generation
export interface RefundGeneration {
  _id: string;
  claimId?: string;
  disputeId?: string;
  refundDetails: {
    description: string;
    amount: number;
  };
  employeeId: string;
  financeStaffId?: string;
  status: 'pending' | 'processed' | 'paid';
  createdAt: string;
  updatedAt: string;
  paidInPayrollRunId?: string;
  __v?: number;
}

export interface RefundRequest {
  disputeId?: string;
  claimId?: string;
  refundDetails: {
    description: string;
    amount: number;
  };
  employeeId: string;
  financeStaffId?: string;
  status?: 'pending' | 'processed' | 'paid';
  paidInPayrollRunId?: string;
}

export interface PayrollCycle {
  id: string;
  name: string;
  period: string;
  status: 'draft' | 'processing' | 'completed' | 'locked';
  startDate: string;
  endDate: string;
}

// API Service Functions
export const financeStaffService = {
  // Month-End and Year-End Payroll Summaries
  async getPayrollSummaries(filters?: SummaryFilters) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);

    const response = await api.get<PayrollSummary[]>(`/finance/payroll-summaries?${params}`);
    return response;
  },

  async generatePayrollSummary(reportData: {
    reportType?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.post<PayrollSummary>('/finance/payroll-summaries/generate', reportData);
    return response;
  },

  async downloadPayrollSummary(summaryId: string) {
    const response = await api.get<Blob>(`/finance/payroll-summaries/${summaryId}/download`);
    return response;
  },

  // Tax, Insurance, and Benefits Reports
  async getTaxReports(period?: string) {
    const params = period ? `?period=${period}` : '';
    const response = await api.get<TaxReport[]>(`/finance/tax-reports${params}`);
    return response;
  },

  async generateTaxReport(period: string) {
    const response = await api.post<TaxReport>('/finance/tax-reports/generate', { period });
    return response;
  },

  async getInsuranceReports(period?: string) {
    const params = period ? `?period=${period}` : '';
    const response = await api.get<InsuranceReport[]>(`/finance/insurance-reports${params}`);
    return response;
  },

  async generateInsuranceReport(period: string) {
    const response = await api.post<InsuranceReport>('/finance/insurance-reports/generate', { period });
    return response;
  },

  async getBenefitsReports(period?: string) {
    const params = period ? `?period=${period}` : '';
    const response = await api.get<BenefitsReport[]>(`/finance/benefits-reports${params}`);
    return response;
  },

  async generateBenefitsReport(period: string) {
    const response = await api.post<BenefitsReport>('/finance/benefits-reports/generate', { period });
    return response;
  },

  async getPayslipHistory(period?: string) {
    const params = period ? `?period=${period}` : '';
    const response = await api.get<PayslipHistoryReport[]>(`/finance/payslip-history${params}`);
    return response;
  },

  async generatePayslipHistoryReport(period: string) {
    const response = await api.post<PayslipHistoryReport>('/finance/payslip-history/generate', { period });
    return response;
  },

  async downloadReport(reportId: string, reportType: 'tax' | 'insurance' | 'benefits' | 'payslip-history' | 'payroll-summary') {
    const response = await api.get<Blob>(`/finance/${reportType}-reports/${reportId}/download`);
    return response;
  },

  // Approved Disputes and Claims Notifications
  async getApprovedDisputes() {
    const response = await api.get<ApprovedDispute[]>('/payroll/tracking/disputes/approved');
    return response;
  },

  async getApprovedClaims() {
    const response = await api.get<ApprovedClaim[]>('/payroll/tracking/claims/approved');
    return response;
  },

  async markNotificationAsRead(type: 'dispute' | 'claim', id: string) {
    const response = await api.post(`/finance/notifications/${type}/${id}/read`);
    return response;
  },

  // Refund Generation
  async getRefunds(status?: RefundGeneration['status']) {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<RefundGeneration[]>(`/payroll/tracking/refunds${params}`);
    return response;
  },

  async generateRefund(request: RefundRequest, financeStaffId: string) {
    if (request.disputeId) {
      // Generate dispute refund
      const response = await api.post<RefundGeneration>(
        `/payroll/tracking/refunds/dispute/${request.disputeId}?financeStaffId=${financeStaffId}`,
        {
          refundDetails: {
            amount: request.refundDetails.amount,
            description: request.refundDetails.description
          },
          employeeId: request.employeeId
        }
      );
      return response;
    } else if (request.claimId) {
      // Generate claim refund
      const response = await api.post<RefundGeneration>(
        `/payroll/tracking/refunds/claim/${request.claimId}?financeStaffId=${financeStaffId}`,
        {
          refundDetails: {
            amount: request.refundDetails.amount,
            description: request.refundDetails.description
          },
          employeeId: request.employeeId
        }
      );
      return response;
    } else {
      throw new Error('Either disputeId or claimId must be provided');
    }
  },

  async getPayrollCycles() {
    const response = await api.get<PayrollCycle[]>('/payroll/tracking/payroll-cycles');
    return response;
  },

  async processRefund(refundId: string) {
    const response = await api.post<RefundGeneration>(`/finance/refunds/${refundId}/process`);
    return response;
  },

  async updateRefundStatus(refundId: string, status: RefundGeneration['status'], notes?: string) {
    const response = await api.patch<RefundGeneration>(`/finance/refunds/${refundId}`, { status, notes });
    return response;
  },
};
