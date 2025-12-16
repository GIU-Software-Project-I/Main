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

    requestCorrection: async (data: any) => {
        return apiService.post('/attendance/correction', data);
    },

    getAttendanceRecord: async () => {
        return apiService.get('/attendance/record');
    },

    getTeamAttendance: async () => {
        return apiService.get('/attendance/team');
    },

    approveCorrection: async (id: string) => {
        return apiService.patch(`/attendance/correction/${id}/approve`);
    },

    rejectCorrection: async (id: string) => {
        return apiService.patch(`/attendance/correction/${id}/reject`);
    },

    // ============================================================
    // SHIFT TYPE OPERATIONS
    // ============================================================

    // Create shift type - POST /time-management/shift-types
    createShiftType: async (data: CreateShiftTypeDto) => {
        return apiService.post<ShiftType>('/shift-management/shift-types', data);
    },

    // Get all shift types - GET /time-management/shift-types
    getShiftTypes: async () => {
        return apiService.get<ShiftType[]>('/shift-management/shift-types');
    },

    // Update shift type - PATCH /time-management/shift-types/:id
    updateShiftType: async (id: string, data: UpdateShiftTypeDto) => {
        return apiService.patch<ShiftType>(`/shift-management/shift-types/${id}`, data);
    },

    // Deactivate shift type - DELETE /time-management/shift-types/:id
    deactivateShiftType: async (id: string) => {
        return apiService.delete(`/shift-management/shift-types/${id}`);
    },

    // ============================================================
    // SHIFT OPERATIONS
    // ============================================================

    // Create shift - POST /time-management/shifts
    createShift: async (data: CreateShiftDto) => {
        return apiService.post<Shift>('/shift-management/shifts', data);
    },

    // Get all shifts - GET /time-management/shifts
    getShifts: async () => {
        return apiService.get<Shift[]>('/shift-management/shifts');
    },

    // Update shift - PATCH /time-management/shifts/:id
    updateShift: async (id: string, data: UpdateShiftDto) => {
        return apiService.patch<Shift>(`/shift-management/shifts/${id}`, data);
    },

    // Deactivate shift - DELETE /shift-management/shifts/:id
    deactivateShift: async (id: string) => {
        return apiService.delete(`/shift-management/shifts/${id}`);
    },

    // ============================================================
    // SCHEDULE RULE OPERATIONS
    // ============================================================

    // Create schedule rule - POST /shift-management/schedule-rules
    createScheduleRule: async (data: CreateScheduleRuleDto) => {
        return apiService.post<ScheduleRule>('/shift-management/schedule-rules', data);
    },

    // Get all schedule rules - GET /shift-management/schedule-rules
    getScheduleRules: async () => {
        return apiService.get<ScheduleRule[]>('/shift-management/schedule-rules');
    },

    // Update schedule rule - PATCH /shift-management/schedule-rules/:id
    updateScheduleRule: async (id: string, data: UpdateScheduleRuleDto) => {
        return apiService.patch<ScheduleRule>(`/shift-management/schedule-rules/${id}`, data);
    },

    // Deactivate schedule rule - DELETE /shift-management/schedule-rules/:id
    deactivateScheduleRule: async (id: string) => {
        return apiService.delete(`/shift-management/schedule-rules/${id}`);
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

    // Get all pending corrections - GET /attendance-correction
    getPendingCorrections: async () => {
        return apiService.get<AttendanceCorrectionRequest[]>('/attendance-correction');
    },
};

