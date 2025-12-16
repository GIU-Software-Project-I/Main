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

// Shift Type interfaces
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

    // Deactivate shift - DELETE /time-management/shifts/:id
    deactivateShift: async (id: string) => {
        return apiService.delete(`/shift-management/shifts/${id}`);
    },
};

