import apiService from '../api';

// DTO Types
export interface CreateDisputeDto {
  payslipId: string;
  description: string;
  amount?: number;
}

export interface UpdateDisputeDto {
  description?: string;
  status?: string;
}

export interface CreateClaimDto {
  claimType: string;
  description: string;
  amount: number;
}

export interface UpdateClaimDto {
  description?: string;
  amount?: number;
  status?: string;
}

export interface CreateRefundDto {
  amount: number;
  description?: string;
}

export interface UpdateRefundDto {
  amount?: number;
  description?: string;
  status?: string;
}

export const payrollTrackingService = {
  // ========== Employee Self-Service Endpoints ==========

  // GET /payroll/tracking/employee/:employeeId/payslips
  getEmployeePayslips: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/payslips`);
  },

  // GET /payroll/tracking/payslip/:payslipId/employee/:employeeId
  getPayslipDetails: async (payslipId: string, employeeId: string) => {
    return apiService.get(`/payroll/tracking/payslip/${payslipId}/employee/${employeeId}`);
  },

  // GET /payroll/tracking/payslip/:payslipId/employee/:employeeId/download
  // Returns a file blob for download
  downloadPayslip: async (payslipId: string, employeeId: string) => {
    return apiService.downloadFile(`/payroll/tracking/payslip/${payslipId}/employee/${employeeId}/download`);
  },

  // GET /payroll/tracking/employee/:employeeId/base-salary
  getBaseSalary: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/base-salary`);
  },

  // GET /payroll/tracking/employee/:employeeId/leave-compensation
  getLeaveCompensation: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/leave-compensation`);
  },

  // GET /payroll/tracking/employee/:employeeId/transportation
  getTransportationCompensation: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/transportation`);
  },

  // GET /payroll/tracking/employee/:employeeId/tax-deductions
  getTaxDeductions: async (employeeId: string, payslipId?: string) => {
    const query = payslipId ? `?payslipId=${payslipId}` : '';
    return apiService.get(`/payroll/tracking/employee/${employeeId}/tax-deductions${query}`);
  },

  // GET /payroll/tracking/employee/:employeeId/insurance-deductions
  getInsuranceDeductions: async (employeeId: string, payslipId?: string) => {
    const query = payslipId ? `?payslipId=${payslipId}` : '';
    return apiService.get(`/payroll/tracking/employee/${employeeId}/insurance-deductions${query}`);
  },

  // GET /payroll/tracking/employee/:employeeId/misconduct-deductions
  getMisconductDeductions: async (employeeId: string, payslipId?: string) => {
    const query = payslipId ? `?payslipId=${payslipId}` : '';
    return apiService.get(`/payroll/tracking/employee/${employeeId}/misconduct-deductions${query}`);
  },

  // GET /payroll/tracking/employee/:employeeId/attendance-based-deductions
  getAttendanceBasedDeductions: async (
    employeeId: string,
    options?: { payslipId?: string; from?: string; to?: string }
  ) => {
    const params = new URLSearchParams();
    if (options?.payslipId) params.append('payslipId', options.payslipId);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiService.get(`/payroll/tracking/employee/${employeeId}/attendance-based-deductions${query}`);
  },

  // GET /payroll/tracking/employee/:employeeId/unpaid-leave-deductions
  getUnpaidLeaveDeductions: async (
    employeeId: string,
    options?: { payslipId?: string; from?: string; to?: string }
  ) => {
    const params = new URLSearchParams();
    if (options?.payslipId) params.append('payslipId', options.payslipId);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiService.get(`/payroll/tracking/employee/${employeeId}/unpaid-leave-deductions${query}`);
  },

  // GET /payroll/tracking/employee/:employeeId/salary-history
  getSalaryHistory: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/salary-history`);
  },

  // GET /payroll/tracking/employee/:employeeId/employer-contributions
  getEmployerContributions: async (employeeId: string, payslipId?: string) => {
    const query = payslipId ? `?payslipId=${payslipId}` : '';
    return apiService.get(`/payroll/tracking/employee/${employeeId}/employer-contributions${query}`);
  },

  // GET /payroll/tracking/employee/:employeeId/tax-documents
  getTaxDocuments: async (employeeId: string, year?: number) => {
    const query = year ? `?year=${year}` : '';
    return apiService.get(`/payroll/tracking/employee/${employeeId}/tax-documents${query}`);
  },

  // GET /payroll/tracking/employee/:employeeId/tax-documents/:year/download
  downloadAnnualTaxStatement: async (employeeId: string, year: number) => {
    return apiService.downloadFile(`/payroll/tracking/employee/${employeeId}/tax-documents/${year}/download`);
  },

  // POST /payroll/tracking/employee/:employeeId/disputes
  createDispute: async (employeeId: string, data: CreateDisputeDto) => {
    return apiService.post(`/payroll/tracking/employee/${employeeId}/disputes`, data);
  },

  // POST /payroll/tracking/employee/:employeeId/claims
  createClaim: async (employeeId: string, data: CreateClaimDto) => {
    return apiService.post(`/payroll/tracking/employee/${employeeId}/claims`, data);
  },

  // GET /payroll/tracking/employee/:employeeId/track-requests
  trackClaimsAndDisputes: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/track-requests`);
  },

  // ========== Operational Reports Endpoints ==========

  // GET /payroll/tracking/reports/department-payroll
  generateDepartmentPayrollReport: async (options?: {
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.departmentId) params.append('departmentId', options.departmentId);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiService.get(`/payroll/tracking/reports/department-payroll${query}`);
  },

  // GET /payroll/tracking/reports/payroll-summary
  generatePayrollSummary: async (type: 'monthly' | 'yearly', period?: string) => {
    const params = new URLSearchParams();
    params.append('type', type);
    if (period) params.append('period', period);
    return apiService.get(`/payroll/tracking/reports/payroll-summary?${params.toString()}`);
  },

  // GET /payroll/tracking/reports/compliance
  generateComplianceReport: async (type: string, year?: number) => {
    const params = new URLSearchParams();
    params.append('type', type);
    if (year) params.append('year', year.toString());
    return apiService.get(`/payroll/tracking/reports/compliance?${params.toString()}`);
  },

  // ========== Disputes and Claims Approval Endpoints ==========

  // PUT /payroll/tracking/disputes/:disputeId/review
  reviewDispute: async (
    disputeId: string,
    specialistId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/disputes/${disputeId}/review?specialistId=${specialistId}&action=${action}`,
      { reason }
    );
  },

  // PUT /payroll/tracking/disputes/:disputeId/confirm
  confirmDisputeApproval: async (
    disputeId: string,
    managerId: string,
    action: 'confirm' | 'reject',
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/disputes/${disputeId}/confirm?managerId=${managerId}&action=${action}`,
      { reason }
    );
  },

  // GET /payroll/tracking/disputes/approved
  getApprovedDisputes: async (financeStaffId?: string) => {
    const query = financeStaffId ? `?financeStaffId=${financeStaffId}` : '';
    return apiService.get(`/payroll/tracking/disputes/approved${query}`);
  },

  // PUT /payroll/tracking/claims/:claimId/review
  reviewClaim: async (
    claimId: string,
    specialistId: string,
    action: 'approve' | 'reject',
    approvedAmount?: number,
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/claims/${claimId}/review?specialistId=${specialistId}&action=${action}`,
      { approvedAmount, reason }
    );
  },

  // PUT /payroll/tracking/claims/:claimId/confirm
  confirmClaimApproval: async (
    claimId: string,
    managerId: string,
    action: 'confirm' | 'reject',
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/claims/${claimId}/confirm?managerId=${managerId}&action=${action}`,
      { reason }
    );
  },

  // GET /payroll/tracking/claims/approved
  getApprovedClaims: async (financeStaffId?: string) => {
    const query = financeStaffId ? `?financeStaffId=${financeStaffId}` : '';
    return apiService.get(`/payroll/tracking/claims/approved${query}`);
  },

  // ========== Refund Process Endpoints ==========

  // POST /payroll/tracking/refunds/dispute/:disputeId
  generateDisputeRefund: async (
    disputeId: string,
    financeStaffId: string,
    data: CreateRefundDto
  ) => {
    return apiService.post(
      `/payroll/tracking/refunds/dispute/${disputeId}?financeStaffId=${financeStaffId}`,
      data
    );
  },

  // POST /payroll/tracking/refunds/claim/:claimId
  generateClaimRefund: async (
    claimId: string,
    financeStaffId: string,
    data: CreateRefundDto
  ) => {
    return apiService.post(
      `/payroll/tracking/refunds/claim/${claimId}?financeStaffId=${financeStaffId}`,
      data
    );
  },

  // GET /payroll/tracking/refunds/pending
  getPendingRefunds: async () => {
    return apiService.get('/payroll/tracking/refunds/pending');
  },

  // PUT /payroll/tracking/refunds/:refundId/mark-paid
  markRefundAsPaid: async (refundId: string, payrollRunId: string) => {
    return apiService.put(`/payroll/tracking/refunds/${refundId}/mark-paid`, { payrollRunId });
  },

  // ========== CRUD Endpoints for Claims ==========

  // GET /payroll/tracking/claims
  getAllClaims: async (status?: string, employeeId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (employeeId) params.append('employeeId', employeeId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiService.get(`/payroll/tracking/claims${query}`);
  },

  // GET /payroll/tracking/claims/:id
  getClaimById: async (id: string) => {
    return apiService.get(`/payroll/tracking/claims/${id}`);
  },

  // PUT /payroll/tracking/claims/:id
  updateClaim: async (id: string, data: UpdateClaimDto) => {
    return apiService.put(`/payroll/tracking/claims/${id}`, data);
  },

  // DELETE /payroll/tracking/claims/:id
  deleteClaim: async (id: string) => {
    return apiService.delete(`/payroll/tracking/claims/${id}`);
  },

  // ========== CRUD Endpoints for Disputes ==========

  // GET /payroll/tracking/disputes
  getAllDisputes: async (status?: string, employeeId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (employeeId) params.append('employeeId', employeeId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiService.get(`/payroll/tracking/disputes${query}`);
  },

  // GET /payroll/tracking/disputes/:id
  getDisputeById: async (id: string) => {
    return apiService.get(`/payroll/tracking/disputes/${id}`);
  },

  // PUT /payroll/tracking/disputes/:id
  updateDispute: async (id: string, data: UpdateDisputeDto) => {
    return apiService.put(`/payroll/tracking/disputes/${id}`, data);
  },

  // DELETE /payroll/tracking/disputes/:id
  deleteDispute: async (id: string) => {
    return apiService.delete(`/payroll/tracking/disputes/${id}`);
  },

  // ========== CRUD Endpoints for Refunds ==========

  // GET /payroll/tracking/refunds
  getAllRefunds: async (status?: string, employeeId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (employeeId) params.append('employeeId', employeeId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiService.get(`/payroll/tracking/refunds${query}`);
  },

  // GET /payroll/tracking/refunds/:id
  getRefundById: async (id: string) => {
    return apiService.get(`/payroll/tracking/refunds/${id}`);
  },

  // PUT /payroll/tracking/refunds/:id
  updateRefund: async (id: string, data: UpdateRefundDto) => {
    return apiService.put(`/payroll/tracking/refunds/${id}`, data);
  },

  // DELETE /payroll/tracking/refunds/:id
  deleteRefund: async (id: string) => {
    return apiService.delete(`/payroll/tracking/refunds/${id}`);
  },
};