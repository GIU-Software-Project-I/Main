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
  name?: string;
  title: string;
  totalTaxWithheld: number;
  taxTypes: TaxTypeBreakdown[];
  taxRules?: any[];
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
  name?: string;
  title: string;
  totalPayslips: number;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  payslips?: any[];
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
    // Period can be YYYY-MM (monthly) or YYYY (yearly)
    let year: number;
    if (period.includes('-')) {
      year = parseInt(period.split('-')[0]);
    } else {
      year = parseInt(period);
    }
    
    const params = new URLSearchParams({
      type: 'tax',
      year: year.toString()
    });
    const response = await api.get<TaxReport>(`/payroll/tracking/reports/compliance?${params.toString()}`);
    return response;
  },

  async getInsuranceReports(period?: string) {
    const params = period ? `?period=${period}` : '';
    const response = await api.get<InsuranceReport[]>(`/finance/insurance-reports${params}`);
    return response;
  },

  async generateInsuranceReport(period: string) {
    // Fetch insurance brackets from the database
    const response = await api.get<any>('/payroll-configuration-requirements/insurance-brackets');
    console.log('Insurance brackets API response:', response);
    
    // Transform response to match InsuranceReport format
    // response.data contains the brackets array from the backend
    const brackets = response.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [];
    console.log('Insurance brackets:', brackets);
    
    // Calculate totals and group by insurance type
    const insuranceTypes: { [key: string]: any } = {};
    
    brackets.forEach((bracket: any) => {
      const type = bracket.name || 'Unknown';
      if (!insuranceTypes[type]) {
        insuranceTypes[type] = {
          insuranceType: type,
          brackets: [],
          totalAmount: 0,
          employeeContribution: 0,
          employerContribution: 0,
          employeeCount: 0
        };
      }
      insuranceTypes[type].brackets.push(bracket);
      insuranceTypes[type].employeeCount++;
    });
    
    return {
      data: {
        id: `insurance_${Date.now()}`,
        title: 'Insurance Brackets Report',
        period: period,
        generatedAt: new Date().toISOString(),
        insuranceBrackets: brackets.map((b: any) => ({
          id: b._id || b.id,
          name: b.name,
          amount: b.amount,
          status: b.status,
          minSalary: b.minSalary,
          maxSalary: b.maxSalary,
          employeeRate: b.employeeRate,
          employerRate: b.employerRate,
          createdBy: b.createdBy,
          approvedBy: b.approvedBy,
          approvedAt: b.approvedAt,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt
        })),
        totalContributions: 0,
        totalEmployeeContributions: 0,
        totalEmployerContributions: 0,
        employeeCount: brackets.length,
        insuranceTypes: Object.values(insuranceTypes),
        status: 'final'
      }
    };
  },

  async getBenefitsReports(period?: string) {
    const params = period ? `?period=${period}` : '';
    const response = await api.get<BenefitsReport[]>(`/finance/benefits-reports${params}`);
    return response;
  },

  async generateBenefitsReport(period: string) {
    // Fetch termination/resignation benefits from the database
    const response = await api.get<any>('/payroll-configuration-requirements/termination-benefits/all');
    
    console.log('Termination benefits API response:', response);
    
    // Get benefits data from response
    const benefitsData = response.data?.data || response.data || [];
    console.log('Benefits data:', benefitsData);
    
    // Transform response to match BenefitsReport format
    const benefitTypes: BenefitTypeBreakdown[] = benefitsData.map((benefit: any) => ({
      benefitType: benefit.name,
      amount: benefit.amount || 0,
      terms: benefit.terms || '',
      status: benefit.status,
      createdAt: benefit.createdAt,
      updatedAt: benefit.updatedAt,
      approvedAt: benefit.approvedAt,
      id: benefit._id || benefit.id
    }));
    
    const totalBenefits = benefitsData.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    
    return {
      data: {
        id: `benefits_report_${Date.now()}`,
        title: 'Termination & Resignation Benefits Report',
        period: period,
        generatedAt: new Date().toISOString(),
        totalBenefits,
        employeeCount: benefitsData.length,
        status: 'final' as const,
        benefitTypes,
        benefits: benefitsData
      }
    };
  },

  async getPayslipHistory(period?: string) {
    const params = period ? `?period=${period}` : '';
    const response = await api.get<PayslipHistoryReport[]>(`/finance/payslip-history${params}`);
    return response;
  },

  async generatePayslipHistoryReport(period: string) {
    // Period can be YYYY-MM (monthly) or YYYY (yearly)
    let startDate: string;
    let endDate: string;
    
    if (period.includes('-')) {
      // Monthly: YYYY-MM format
      const [year, month] = period.split('-');
      startDate = `${year}-${month}-01`;
      endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
    } else {
      // Yearly: YYYY format
      startDate = `${period}-01-01`;
      endDate = `${period}-12-31`;
    }
    
    const response = await api.get<any>(`/payroll/tracking/reports/payslip-history?startDate=${startDate}&endDate=${endDate}`);
    
    // Transform response to match PayslipHistoryReport format
    if (response.data) {
      const data = response.data;
      return {
        data: {
          id: `payslip_history_${Date.now()}`,
          title: 'Payslip History Report',
          period: period,
          generatedAt: data.generatedDate || new Date().toISOString(),
          totalPayslips: data.summary?.totalPayslips || 0,
          employeeCount: data.summary?.uniqueEmployees || 0,
          totalGrossPay: data.summary?.totalGrossSalary || 0,
          totalNetPay: data.summary?.totalNetPay || 0,
          totalDeductions: data.summary?.totalDeductions || 0,
          payslips: data.payslips || [],
          departmentBreakdown: []
        }
      };
    }
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
