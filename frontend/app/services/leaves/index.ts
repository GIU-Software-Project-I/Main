import apiService from '../api';

// Unified leaves API client aligned with backend `UnifiedLeaveController`
export const leavesService = {
  // Create a new leave request
  submitRequest: async (data: {
    employeeId: string;
    leaveTypeId: string;
    from: string;
    to: string;
    durationDays?: number;
    justification?: string;
    attachmentId?: string;
    postLeave?: boolean;
  }) => {
    return apiService.post('/leaves/requests', data);
  },

  // Get the current employee's leave history ("My Leaves")
  getMyRequests: async (employeeId: string, params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) {
      query.set('status', params.status);
    }
    const qs = query.toString();
    const endpoint = qs
      ? `/leaves/employees/${employeeId}/history?${qs}`
      : `/leaves/employees/${employeeId}/history`;

    return apiService.get(endpoint);
  },

  // Get the current employee's leave balances by leave type
  getBalance: async (employeeId: string) => {
    return apiService.get(`/leaves/employees/${employeeId}/balances`);
  },

  // Update an existing leave request
  updateRequest: async (
    id: string,
    data: Partial<{
      from: string;
      to: string;
      durationDays: number;
      justification: string;
      attachmentId: string;
      postLeave: boolean;
    }>,
  ) => {
    return apiService.patch(`/leaves/requests/${id}`, data);
  },

  // Cancel a leave request for the given employee
  cancelRequest: async (id: string, employeeId: string) => {
    return apiService.patch(`/leaves/requests/${id}/cancel?employeeId=${employeeId}`);
  },

  // Get all leave types
  getLeaveTypes: async () => {
    return apiService.get('/leaves/types');
  },

  // Get a single leave request by id
  getRequest: async (id: string) => {
    return apiService.get(`/leaves/requests/${id}`);
  },

  // Save an attachment metadata record
  saveAttachment: async (data: {
    originalName: string;
    filePath: string;
    fileType?: string;
    size?: number;
  }) => {
    return apiService.post('/leaves/attachments', data);
  },

  // HR Manager / Admin functions
  // Get all leave requests (for HR/Admin)
  getAllRequests: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: string;
    status?: string;
    leaveTypeId?: string;
    from?: string;
    to?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.status) query.set('status', params.status);
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    return apiService.get(qs ? `/leaves/requests?${qs}` : '/leaves/requests');
  },

  // Manager approve/reject
  managerApprove: async (id: string, managerId: string) => {
    return apiService.patch(`/leaves/requests/${id}/manager-approve?managerId=${managerId}`);
  },

  managerReject: async (id: string, managerId: string, reason?: string) => {
    const query = new URLSearchParams();
    query.set('managerId', managerId);
    if (reason) query.set('reason', reason);
    return apiService.patch(`/leaves/requests/${id}/manager-reject?${query.toString()}`);
  },

  // HR finalize (approve/reject)
  hrFinalize: async (id: string, hrId: string, decision: 'approve' | 'reject', allowNegative?: boolean) => {
    const query = new URLSearchParams();
    query.set('hrId', hrId);
    query.set('decision', decision);
    if (allowNegative) query.set('allowNegative', 'true');
    return apiService.patch(`/leaves/requests/${id}/hr-finalize?${query.toString()}`);
  },

  // Assign entitlement to employee
  assignEntitlement: async (data: {
    employeeId: string;
    leaveTypeId: string;
    yearlyEntitlement: number;
  }) => {
    return apiService.post('/leaves/entitlements/assign', data);
  },

  // Get employee entitlements
  getEntitlements: async (employeeId: string) => {
    return apiService.get(`/leaves/entitlements/${employeeId}`);
  },

  // Create manual balance adjustment
  createAdjustment: async (data: {
    employeeId: string;
    leaveTypeId: string;
    type: 'add' | 'deduct';
    days: number;
    reason: string;
    effectiveDate: string;
  }) => {
    return apiService.post('/leaves/adjustments', data);
  },

  // ============================================
  // HR ADMIN CONFIGURATION METHODS
  // ============================================

  // Leave Categories
  createCategory: async (data: { name: string; description?: string }) => {
    return apiService.post('/leaves/categories', data);
  },

  getAllCategories: async () => {
    return apiService.get('/leaves/categories');
  },

  getCategory: async (id: string) => {
    return apiService.get(`/leaves/categories/${id}`);
  },

  updateCategory: async (id: string, data: { name?: string; description?: string }) => {
    return apiService.put(`/leaves/categories/${id}`, data);
  },

  deleteCategory: async (id: string) => {
    return apiService.delete(`/leaves/categories/${id}`);
  },

  // Leave Types
  createLeaveType: async (data: {
    code: string;
    name: string;
    categoryId: string;
    description?: string;
    paid?: boolean;
    deductible?: boolean;
    requiresAttachment?: boolean;
    attachmentType?: 'medical' | 'document' | 'other';
    minTenureMonths?: number;
    maxDurationDays?: number;
  }) => {
    return apiService.post('/leaves/types', data);
  },

  updateLeaveType: async (id: string, data: {
    code?: string;
    name?: string;
    categoryId?: string;
    description?: string;
    paid?: boolean;
    deductible?: boolean;
    requiresAttachment?: boolean;
    attachmentType?: 'medical' | 'document' | 'other';
    minTenureMonths?: number;
    maxDurationDays?: number;
  }) => {
    return apiService.put(`/leaves/types/${id}`, data);
  },

  deleteLeaveType: async (id: string) => {
    return apiService.delete(`/leaves/types/${id}`);
  },

  getLeaveType: async (id: string) => {
    return apiService.get(`/leaves/types/${id}`);
  },

  // Leave Eligibility
  setEligibility: async (id: string, data: {
    minTenureMonths?: number;
    positionsAllowed?: string[];
    contractTypesAllowed?: string[];
    employmentTypes?: string[];
  }) => {
    return apiService.patch(`/leaves/types/${id}/eligibility`, data);
  },

  // Leave Policies
  createPolicy: async (data: {
    leaveTypeId: string;
    accrualMethod: 'monthly' | 'yearly' | 'per-term';
    monthlyRate?: number;
    yearlyRate?: number;
    carryForwardAllowed?: boolean;
    maxCarryForward?: number;
    expiryAfterMonths?: number;
    roundingRule?: 'none' | 'round' | 'round_up' | 'round_down';
    minNoticeDays?: number;
    maxConsecutiveDays?: number;
  }) => {
    return apiService.post('/leaves/policies', data);
  },

  getPolicies: async () => {
    return apiService.get('/leaves/policies');
  },

  getPolicyByLeaveType: async (leaveTypeId: string) => {
    return apiService.get(`/leaves/policies/by-leave-type/${leaveTypeId}`);
  },

  getPolicy: async (id: string) => {
    return apiService.get(`/leaves/policies/${id}`);
  },

  updatePolicy: async (id: string, data: {
    accrualMethod?: 'monthly' | 'yearly' | 'per-term';
    monthlyRate?: number;
    yearlyRate?: number;
    carryForwardAllowed?: boolean;
    maxCarryForward?: number;
    expiryAfterMonths?: number;
    roundingRule?: 'none' | 'round' | 'round_up' | 'round_down';
    minNoticeDays?: number;
    maxConsecutiveDays?: number;
  }) => {
    return apiService.put(`/leaves/policies/${id}`, data);
  },

  deletePolicy: async (id: string) => {
    return apiService.delete(`/leaves/policies/${id}`);
  },

  // Calendar & Holidays
  addHoliday: async (data: { year: number; date: string; reason?: string }) => {
    return apiService.post('/leaves/calendar/holidays', data);
  },

  addBlockedPeriod: async (data: { year: number; from: string; to: string; reason: string }) => {
    return apiService.post('/leaves/calendar/blocked-periods', data);
  },

  getCalendar: async (year: number) => {
    return apiService.get(`/leaves/calendar/${year}`);
  },

  updateCalendar: async (year: number, data: { holidays?: string[]; blockedPeriods?: Array<{ from: string; to: string; reason: string }> }) => {
    return apiService.put(`/leaves/calendar/${year}`, data);
  },

  removeHoliday: async (year: number, date: string) => {
    return apiService.delete(`/leaves/calendar/${year}/holidays?date=${date}`);
  },

  // Accruals & Carry Forward
  runAccrual: async (data?: {
    referenceDate?: string;
    method?: 'monthly' | 'yearly' | 'per-term';
    roundingRule?: 'none' | 'round' | 'round_up' | 'round_down';
  }) => {
    const query = data?.referenceDate ? `?referenceDate=${data.referenceDate}` : '';
    return apiService.post(`/leaves/accruals/run${query}`, {
      method: data?.method,
      roundingRule: data?.roundingRule,
    });
  },

  carryForward: async (data?: {
    referenceDate?: string;
    capDays?: number;
    expiryMonths?: number;
  }) => {
    const query = data?.referenceDate ? `?referenceDate=${data.referenceDate}` : '';
    return apiService.post(`/leaves/accruals/carryforward${query}`, {
      capDays: data?.capDays,
      expiryMonths: data?.expiryMonths,
    });
  },

  recalcEmployee: async (employeeId: string) => {
    return apiService.get(`/leaves/accruals/employee/${employeeId}/recalc`);
  },

  // Leave Year Reset
  resetLeaveYear: async (data: {
    strategy: 'hireDate' | 'calendarYear' | 'custom';
    referenceDate?: string;
  }) => {
    return apiService.post('/leaves/accruals/reset-year', data);
  },
};


