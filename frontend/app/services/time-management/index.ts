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
export const timeManagementService = {
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
};

