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

  // Get the current employee's leave history ("My Leaves") with filtering and sorting
  getMyRequests: async (employeeId: string, params?: {
    status?: string;
    leaveTypeId?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

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

  // ============================================
  // MANAGER TEAM VIEW METHODS
  // ============================================

  // Get team members' leave balances
  getTeamBalances: async (managerId: string, params?: {
    department?: string;
    leaveTypeId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.department) query.set('department', params.department);
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    const qs = query.toString();
    return apiService.get(qs
      ? `/leaves/manager/${managerId}/team-balances?${qs}`
      : `/leaves/manager/${managerId}/team-balances`
    );
  },

  // Get team members' leave requests (upcoming/history)
  getTeamRequests: async (managerId: string, params?: {
    leaveTypeId?: string;
    status?: string;
    department?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    if (params?.status) query.set('status', params.status);
    if (params?.department) query.set('department', params.department);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return apiService.get(qs
      ? `/leaves/manager/${managerId}/team-requests?${qs}`
      : `/leaves/manager/${managerId}/team-requests`
    );
  },

  // Get irregular leave patterns for team
  getIrregularPatterns: async (managerId: string, params?: {
    department?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.department) query.set('department', params.department);
    const qs = query.toString();
    return apiService.get(qs
      ? `/leaves/manager/${managerId}/irregular-patterns?${qs}`
      : `/leaves/manager/${managerId}/irregular-patterns`
    );
  },

  // Flag a leave request as irregular
  flagIrregular: async (requestId: string, flag: boolean, reason?: string) => {
    return apiService.post(`/leaves/manager/flag-irregular/${requestId}`, {
      flag,
      reason,
    });
  },

  // Return leave request for correction (manager/HR can return to employee for fixes)
  returnForCorrection: async (id: string, reviewerId: string, reason: string) => {
    const query = new URLSearchParams();
    query.set('reviewerId', reviewerId);
    query.set('reason', reason);
    return apiService.patch(`/leaves/requests/${id}/return-for-correction?${query.toString()}`);
  },

  // Resubmit a corrected leave request (employee resubmits after corrections)
  resubmitCorrectedRequest: async (id: string, employeeId: string, corrections: Partial<{
    from: string;
    to: string;
    justification: string;
    attachmentId: string;
  }>) => {
    return apiService.patch(`/leaves/requests/${id}/resubmit?employeeId=${employeeId}`, corrections);
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

  // ============================================
  // LEAVE REQUEST VALIDATION HELPERS
  // ============================================


  // Check if employee has overlapping leave requests
  checkOverlappingRequests: async (employeeId: string, from: string, to: string) => {
    // Get employee's history and check for overlaps
    const response = await apiService.get(`/leaves/employees/${employeeId}/history`);
    if (response.error || !response.data) {
      return { hasOverlap: false, overlappingRequest: null };
    }

    // Handle different response structures - could be array directly or object with data property
    let requests: Array<{
      _id?: string;
      id?: string;
      status: string;
      dates: { from: string; to: string };
    }> = [];

    if (Array.isArray(response.data)) {
      requests = response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Check if it's an object with a data/requests/items array
      const dataObj = response.data as Record<string, unknown>;
      if (Array.isArray(dataObj.data)) {
        requests = dataObj.data;
      } else if (Array.isArray(dataObj.requests)) {
        requests = dataObj.requests;
      } else if (Array.isArray(dataObj.items)) {
        requests = dataObj.items;
      }
    }

    // If still not an array, return no overlap
    if (!Array.isArray(requests)) {
      return { hasOverlap: false, overlappingRequest: null };
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Check for overlaps with PENDING or APPROVED requests
    const overlap = requests.find((req) => {
      if (!req || !req.dates) return false;
      if (req.status !== 'pending' && req.status !== 'approved') {
        return false;
      }
      const reqFrom = new Date(req.dates.from);
      const reqTo = new Date(req.dates.to);
      // Overlap: fromDate <= reqTo AND toDate >= reqFrom
      return fromDate <= reqTo && toDate >= reqFrom;
    });

    return {
      hasOverlap: !!overlap,
      overlappingRequest: overlap || null,
    };
  },

  // Get post-leave configuration (maximum days after leave to submit)
  getPostLeaveConfig: () => {
    // This matches the backend MAX_POST_LEAVE_DAYS = 30
    return {
      maxPostLeaveDays: 30,
      enabled: true,
    };
  },

  // Validate post-leave request dates
  validatePostLeaveRequest: (toDate: string) => {
    const config = leavesService.getPostLeaveConfig();
    const endDate = new Date(toDate);
    const now = new Date();
    const diffMs = now.getTime() - endDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > config.maxPostLeaveDays) {
      return {
        valid: false,
        error: `Post-leave requests must be submitted within ${config.maxPostLeaveDays} days after leave end. Your leave ended ${diffDays} days ago.`,
        daysSinceLeaveEnd: diffDays,
        maxAllowedDays: config.maxPostLeaveDays,
      };
    }

    return {
      valid: true,
      error: null,
      daysSinceLeaveEnd: diffDays,
      maxAllowedDays: config.maxPostLeaveDays,
    };
  },

  // Check if attachment is required for leave type
  checkAttachmentRequirement: async (leaveTypeId: string, durationDays: number) => {
    const response = await apiService.get(`/leaves/types/${leaveTypeId}`);
    if (response.error || !response.data) {
      return { required: false, reason: null };
    }

    const leaveType = response.data as {
      _id?: string;
      name?: string;
      code?: string;
      requiresAttachment?: boolean;
      attachmentType?: string;
    };

    const typeName = (leaveType.name || '').toLowerCase();
    const isSick = typeName.includes('sick');

    // Attachment required if:
    // 1. Leave type requires attachment, OR
    // 2. Sick leave exceeding 1 day (REQ-028: Medical certificate required)
    if (leaveType.requiresAttachment) {
      return {
        required: true,
        reason: `Attachment is required for ${leaveType.name}`,
        attachmentType: leaveType.attachmentType || 'document',
      };
    }

    if (isSick && durationDays > 1) {
      return {
        required: true,
        reason: 'Medical certificate is required for sick leave exceeding 1 day',
        attachmentType: 'medical',
      };
    }

    return { required: false, reason: null };
  },

  // Full validation before submitting leave request (mirrors backend logic)
  validateLeaveRequest: async (data: {
    employeeId: string;
    leaveTypeId: string;
    from: string;
    to: string;
    durationDays: number;
    postLeave?: boolean;
    hasAttachment?: boolean;
    availableBalance: number;
  }) => {
    const errors: string[] = [];

    // 1. Check required fields
    if (!data.employeeId || !data.leaveTypeId || !data.from || !data.to) {
      errors.push('Missing required fields');
    }

    // 2. Check duration
    if (data.durationDays <= 0) {
      errors.push('Invalid date range - duration must be at least 1 day');
    }

    // 3. Post-leave validation
    if (data.postLeave) {
      const postLeaveValidation = leavesService.validatePostLeaveRequest(data.to);
      if (!postLeaveValidation.valid) {
        errors.push(postLeaveValidation.error!);
      }
    }

    // 4. Balance check (skip for post-leave)
    if (!data.postLeave && data.durationDays > data.availableBalance) {
      errors.push(
        `Insufficient leave balance. You have ${data.availableBalance} days available but requested ${data.durationDays} days. You can submit a post-leave request for emergencies.`
      );
    }

    // 5. Check for overlapping requests
    const overlapCheck = await leavesService.checkOverlappingRequests(
      data.employeeId,
      data.from,
      data.to
    );
    if (overlapCheck.hasOverlap) {
      errors.push('You already have a pending or approved leave request for these dates');
    }

    // 6. Check attachment requirement
    const attachmentCheck = await leavesService.checkAttachmentRequirement(
      data.leaveTypeId,
      data.durationDays
    );
    if (attachmentCheck.required && !data.hasAttachment) {
      errors.push(attachmentCheck.reason!);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};


