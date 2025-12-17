import apiService from '../api';

// Types matching backend DTOs
export interface PunchInRequest {
    employeeId: string;
    time?: Date | string; // Optional: format dd/mm/yyyy hh:mm or ISO string
    source?: string; // Optional: source identifier (e.g., 'web-app')
}

export interface PunchOutRequest {
    employeeId: string;
    time?: Date | string; // Optional: format dd/mm/yyyy hh:mm or ISO string
    source?: string; // Optional: source identifier (e.g., 'web-app')
}

// ShiftType interfaces
export interface ShiftType {
    _id: string;
    name: string;
    active: boolean;
}

export interface CreateShiftTypeDto {
    name: string;
    active?: boolean;
}

export interface UpdateShiftTypeDto {
    name?: string;
    active?: boolean;
}

// Shift interfaces
export enum PunchPolicy {
    MULTIPLE = 'MULTIPLE',
    FIRST_LAST = 'FIRST_LAST',
    ONLY_FIRST = 'ONLY_FIRST',
}

export interface Shift {
    _id: string;
    name: string;
    shiftType: string | ShiftType;
    startTime: string;
    endTime: string;
    punchPolicy: PunchPolicy;
    graceInMinutes: number;
    graceOutMinutes: number;
    requiresApprovalForOvertime: boolean;
    active: boolean;
}

export interface CreateShiftDto {
    name: string;
    shiftType: string;
    startTime: string;
    endTime: string;
    punchPolicy?: PunchPolicy;
    graceInMinutes?: number;
    graceOutMinutes?: number;
    requiresApprovalForOvertime?: boolean;
    active?: boolean;
}

export interface UpdateShiftDto {
    name?: string;
    shiftType?: string;
    startTime?: string;
    endTime?: string;
    punchPolicy?: PunchPolicy;
    graceInMinutes?: number;
    graceOutMinutes?: number;
    requiresApprovalForOvertime?: boolean;
    active?: boolean;
}

// Schedule Rule interfaces
export interface ScheduleRule {
    _id: string;
    name: string;
    pattern: string;
    active: boolean;
}

export interface CreateScheduleRuleDto {
    name: string;
    pattern: string;
    active?: boolean;
}

export interface UpdateScheduleRuleDto {
    name?: string;
    pattern?: string;
    active?: boolean;
}

// Overtime Rule interfaces
export interface OvertimeRule {
    _id: string;
    name: string;
    description?: string;
    active: boolean;
    approved: boolean;
}

export interface CreateOvertimeRuleDto {
    name: string;
    description?: string;
    active?: boolean;
    approved?: boolean;
}

export interface UpdateOvertimeRuleDto {
    name?: string;
    description?: string;
    active?: boolean;
    approved?: boolean;
}

// Short-time Rule interfaces
export interface ShortTimeRule {
    _id: string;
    name: string;
    description?: string;
    requiresPreApproval: boolean;
    ignoreWeekends: boolean;
    ignoreHolidays: boolean;
    minShortMinutes: number;
    active: boolean;
    approved: boolean;
}

export interface CreateShortTimeRuleDto {
    name: string;
    description?: string;
    requiresPreApproval?: boolean;
    ignoreWeekends?: boolean;
    ignoreHolidays?: boolean;
    minShortMinutes?: number;
    active?: boolean;
    approved?: boolean;
}

export interface UpdateShortTimeRuleDto {
    name?: string;
    description?: string;
    requiresPreApproval?: boolean;
    ignoreWeekends?: boolean;
    ignoreHolidays?: boolean;
    minShortMinutes?: number;
    active?: boolean;
    approved?: boolean;
}

// Attendance Record interfaces
export enum PunchType {
    IN = 'IN',
    OUT = 'OUT',
}

export enum CorrectionRequestStatus {
    SUBMITTED = 'SUBMITTED',
    IN_REVIEW = 'IN_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    ESCALATED = 'ESCALATED',
}

export interface Punch {
    type: PunchType;
    time: string;
}

export interface AttendanceRecord {
    _id: string;
    employeeId: string;
    punches: Punch[];
    totalWorkMinutes: number;
    hasMissedPunch: boolean;
    exceptionIds: string[];
    finalisedForPayroll: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface AttendanceCorrectionRequest {
    _id: string;
    employeeId: string;
    attendanceRecord: string | AttendanceRecord;
    reason?: string;
    status: CorrectionRequestStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface CorrectAttendanceDto {
    attendanceRecordId: string;
    correctedPunches?: Array<{ type: PunchType; time: string }>;
    addPunchIn?: string;
    addPunchOut?: string;
    removePunchIndex?: number;
    correctionReason: string;
    correctedBy?: string;
}

export interface RequestCorrectionDto {
    employeeId: string;
    attendanceRecordId: string;
    reason: string;
    correctedPunchDate?: string;
    correctedPunchLocalTime?: string;
}

export interface ReviewCorrectionDto {
    correctionRequestId: string;
    reviewerId: string;
    action: 'APPROVE' | 'REJECT';
    note?: string;
}

export interface BulkReviewAttendanceDto {
    employeeId: string;
    startDate: string;
    endDate: string;
    filterByIssue?: 'ALL' | 'MISSING_PUNCH' | 'INVALID_SEQUENCE' | 'SHORT_TIME';
}

export const timeManagementService = {
    // ============================================================
    // ATTENDANCE / PUNCH OPERATIONS
    // ============================================================

    // Punch In - POST /attendance/punch-in
    punchIn: async (data: PunchInRequest) => {
        return apiService.post('/attendance/punch-in', data);
    },

    // Punch Out - POST /attendance/punch-out
    punchOut: async (data: PunchOutRequest) => {
        return apiService.post('/attendance/punch-out', data);
    },

    // Get today's attendance record - GET /attendance/today/:employeeId
    getTodayRecord: async (employeeId: string) => {
        return apiService.get(`/attendance/today/${employeeId}`);
    },

    // Submit correction request - POST /attendance-correction/request
    requestCorrection: async (data: any) => {
        return apiService.post('/attendance-correction/request', data);
    },

    // Get employee's corrections - GET /attendance-correction/:employeeId
    getEmployeeCorrections: async (employeeId: string) => {
        return apiService.get(`/attendance-correction/${employeeId}`);
    },

    // Get all corrections (manager) - GET /attendance-correction/all
    getAllCorrections: async () => {
        return apiService.get('/attendance-correction/all');
    },

    // Get pending corrections (manager) - GET /attendance-correction/pending
    getPendingCorrections: async () => {
        return apiService.get('/attendance-correction/pending');
    },

    // Review correction (approve/reject) - PUT /attendance-correction/review
    reviewCorrection: async (data: { correctionRequestId: string; action: 'APPROVE' | 'REJECT'; reviewerId: string; note?: string }) => {
        return apiService.put('/attendance-correction/review', data);
    },

    getAttendanceRecord: async () => {
        return apiService.get('/attendance/record');
    },

    getTeamAttendance: async () => {
        return apiService.get('/attendance/team');
    },

    approveCorrection: async (id: string, reviewerId: string, note?: string) => {
        return apiService.put('/attendance-correction/review', { correctionRequestId: id, action: 'APPROVE', reviewerId, note });
    },

    rejectCorrection: async (id: string, reviewerId: string, note?: string) => {
        return apiService.put('/attendance-correction/review', { correctionRequestId: id, action: 'REJECT', reviewerId, note });
    },

    // ============================================================
    // SHIFT TYPE OPERATIONS
    // ============================================================

    // Create shift type - POST /time-management/shift-types
    createShiftType: async (data: CreateShiftTypeDto) => {
        return apiService.post<ShiftType>('/time-management/shift-types', data);
    },

    // Get all shift types - GET /time-management/shift-types
    getShiftTypes: async () => {
        return apiService.get<ShiftType[]>('/time-management/shift-types');
    },

    // Update shift type - PATCH /time-management/shift-types/:id
    updateShiftType: async (id: string, data: UpdateShiftTypeDto) => {
        return apiService.patch<ShiftType>(`/time-management/shift-types/${id}`, data);
    },

    // Deactivate shift type - DELETE /time-management/shift-types/:id
    deactivateShiftType: async (id: string) => {
        return apiService.delete(`/time-management/shift-types/${id}`);
    },

    // ============================================================
    // SHIFT OPERATIONS
    // ============================================================

    // Create shift - POST /time-management/shifts
    createShift: async (data: CreateShiftDto) => {
        return apiService.post<Shift>('/time-management/shifts', data);
    },

    // Get all shifts - GET /time-management/shifts
    getShifts: async () => {
        return apiService.get<Shift[]>('/time-management/shifts');
    },

    // Update shift - PATCH /time-management/shifts/:id
    updateShift: async (id: string, data: UpdateShiftDto) => {
        return apiService.patch<Shift>(`/time-management/shifts/${id}`, data);
    },

    // Deactivate shift - DELETE /time-management/shifts/:id
    deactivateShift: async (id: string) => {
        return apiService.delete(`/time-management/shifts/${id}`);
    },

    // ============================================================
    // SCHEDULE RULE OPERATIONS
    // ============================================================

    // Create schedule rule - POST /time-management/schedule-rules
    createScheduleRule: async (data: CreateScheduleRuleDto) => {
        return apiService.post<ScheduleRule>('/time-management/schedule-rules', data);
    },

    // Get all schedule rules - GET /time-management/schedule-rules
    getScheduleRules: async () => {
        return apiService.get<ScheduleRule[]>('/time-management/schedule-rules');
    },

    // Update schedule rule - PATCH /time-management/schedule-rules/:id
    updateScheduleRule: async (id: string, data: UpdateScheduleRuleDto) => {
        return apiService.patch<ScheduleRule>(`/time-management/schedule-rules/${id}`, data);
    },

    // Deactivate schedule rule - DELETE /time-management/schedule-rules/:id
    deactivateScheduleRule: async (id: string) => {
        return apiService.delete(`/time-management/schedule-rules/${id}`);
    },

    // ============================================================
    // OVERTIME RULE OPERATIONS
    // ============================================================

    // Create overtime rule - POST /time-management/overtime-rules
    createOvertimeRule: async (data: CreateOvertimeRuleDto) => {
        return apiService.post<OvertimeRule>('/time-management/overtime-rules', data);
    },

    // Get all overtime rules - GET /time-management/overtime-rules
    getOvertimeRules: async () => {
        return apiService.get<OvertimeRule[]>('/time-management/overtime-rules');
    },

    // Update overtime rule - PATCH /time-management/overtime-rules/:id
    updateOvertimeRule: async (id: string, data: UpdateOvertimeRuleDto) => {
        return apiService.patch<OvertimeRule>(`/time-management/overtime-rules/${id}`, data);
    },

    // Approve overtime rule - POST /time-management/overtime-rules/:id/approve
    approveOvertimeRule: async (id: string) => {
        return apiService.post<OvertimeRule>(`/time-management/overtime-rules/${id}/approve`);
    },

    // ============================================================
    // SHORT-TIME RULE OPERATIONS
    // ============================================================

    // Create short-time rule - POST /time-management/short-time-rules
    createShortTimeRule: async (data: CreateShortTimeRuleDto) => {
        return apiService.post<ShortTimeRule>('/time-management/short-time-rules', data);
    },

    // Get all short-time rules - GET /time-management/short-time-rules
    getShortTimeRules: async () => {
        return apiService.get<ShortTimeRule[]>('/time-management/short-time-rules');
    },

    // Update short-time rule - PATCH /time-management/short-time-rules/:id
    updateShortTimeRule: async (id: string, data: UpdateShortTimeRuleDto) => {
        return apiService.patch<ShortTimeRule>(`/time-management/short-time-rules/${id}`, data);
    },

    // Approve short-time rule - POST /time-management/short-time-rules/:id/approve
    approveShortTimeRule: async (id: string) => {
        return apiService.post<ShortTimeRule>(`/time-management/short-time-rules/${id}/approve`);
    },

    // ============================================================
    // ATTENDANCE RECORD OPERATIONS
    // ============================================================

    // Get monthly attendance - GET /attendance/month/:employeeId?month=X&year=Y
    getMonthlyAttendance: async (employeeId: string, month: number, year: number) => {
        return apiService.get<AttendanceRecord[]>(`/attendance/month/${employeeId}?month=${month}&year=${year}`);
    },

    // Get payroll-ready attendance - GET /attendance/payroll?month=X&year=Y
    getPayrollAttendance: async (month: number, year: number) => {
        return apiService.get<AttendanceRecord[]>(`/attendance/payroll?month=${month}&year=${year}`);
    },

    // Update attendance record - PUT /attendance/:id
    updateAttendanceRecord: async (id: string, data: any) => {
        return apiService.put(`/attendance/${id}`, data);
    },

    // Review attendance record - POST /attendance/review/:recordId
    reviewAttendanceRecord: async (recordId: string) => {
        return apiService.post(`/attendance/review/${recordId}`);
    },

    // Correct attendance record - POST /attendance/correct
    correctAttendanceRecord: async (data: CorrectAttendanceDto) => {
        return apiService.post('/attendance/correct', data);
    },

    // Bulk review attendance - POST /attendance/review/bulk
    bulkReviewAttendance: async (data: BulkReviewAttendanceDto) => {
        return apiService.post('/attendance/review/bulk', data);
    },

    // ============================================================
    // ATTENDANCE CORRECTION REQUEST OPERATIONS
    // ============================================================

    // Request correction (employee) - POST /attendance-correction/request
    requestAttendanceCorrection: async (data: RequestCorrectionDto) => {
        return apiService.post<AttendanceCorrectionRequest>('/attendance-correction/request', data);
    },

    // Review correction (manager) - PUT /attendance-correction/review
    reviewCorrectionRequest: async (data: ReviewCorrectionDto) => {
        return apiService.put('/attendance-correction/review', data);
    },

    // Get employee corrections - GET /attendance-correction/:employeeId
    getEmployeeCorrections: async (employeeId: string) => {
        return apiService.get<AttendanceCorrectionRequest[]>(`/attendance-correction/${employeeId}`);
    },

    // Get all pending corrections - GET /attendance-correction/pending
    getPendingCorrections: async () => {
        return apiService.get<AttendanceCorrectionRequest[]>('/attendance-correction/pending');
    },

    // Get all corrections (including history) - GET /attendance-correction/all
    getAllCorrections: async () => {
        return apiService.get<AttendanceCorrectionRequest[]>('/attendance-correction/all');
    },
};

