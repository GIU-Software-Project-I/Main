import apiService from '../api';

// =============================================
// TEMPORARY: Test User ID for Development
// =============================================
// TODO: Remove this and use actual authentication in production
const TEST_USER_ID = '693dc3ddee07fbcd93854e05'; // Replace with actual user ID from your database

/**
 * Helper function to build query string
 */
const buildQueryString = (params: Record<string, any>): string => {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return filteredParams ? `?${filteredParams}` : '';
};

/**
 * Employee Profile Service
 * Handles all employee profile CRUD operations and corrections
 */
export const employeeProfileService = {
  // =============================================
  // Self-Service Endpoints (Employee)
  // =============================================

  /**
   * Get own profile (self-service)
   * GET /employee-profile/me/:userId (no-auth version for testing)
   */
  getMyProfile: async () => {
    // Using test user ID for development - in production this would use authenticated user
    return apiService.get(`/employee-profile/me/${TEST_USER_ID}`);
  },

  /**
   * Update contact information
   * PATCH /employee-profile/me/:userId/contact-info
   */
  updateContactInfo: async (data: any) => {
    return apiService.patch(`/employee-profile/me/${TEST_USER_ID}/contact-info`, data);
  },

  /**
   * Update biography and photo
   * PATCH /employee-profile/me/:userId/bio
   */
  updateBio: async (data: any) => {
    return apiService.patch(`/employee-profile/me/${TEST_USER_ID}/bio`, data);
  },

  /**
   * Submit correction request
   * POST /employee-profile/me/:userId/correction-request
   */
  submitCorrectionRequest: async (data: any) => {
    return apiService.post(`/employee-profile/me/${TEST_USER_ID}/correction-request`, data);
  },

  /**
   * Get own correction requests (paginated)
   * GET /employee-profile/me/:userId/correction-requests
   */
  getMyCorrectionRequests: async (page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/employee-profile/me/${TEST_USER_ID}/correction-requests${query}`);
  },

  /**
   * Cancel own correction request
   * PATCH /employee-profile/me/:userId/correction-requests/:requestId/cancel
   */
  cancelCorrectionRequest: async (requestId: string) => {
    return apiService.patch(`/employee-profile/me/${TEST_USER_ID}/correction-requests/${requestId}/cancel`, {});
  },

  // =============================================
  // Manager Endpoints (Team View)
  // =============================================

  /**
   * Get team profiles
   * GET /employee-profile/team
   */
  getTeamProfiles: async () => {
    return apiService.get(`/employee-profile/team`);
  },

  /**
   * Get team profiles (paginated)
   * GET /employee-profile/team/paginated
   */
  getTeamProfilesPaginated: async (page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/employee-profile/team/paginated${query}`);
  },

  // =============================================
  // HR Admin Endpoints (Master Data)
  // =============================================

  /**
   * Get all employees (paginated)
   * GET /employee-profile/admin/employees
   */
  getAllEmployees: async (page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/employee-profile/admin/employees${query}`);
  },

  /**
   * Search employees (paginated)
   * GET /employee-profile/admin/search
   */
  searchEmployees: async (q: string, page?: number, limit?: number) => {
    const query = buildQueryString({ q, page, limit });
    return apiService.get(`/employee-profile/admin/search${query}`);
  },

  /**
   * Get all change requests (paginated)
   * GET /employee-profile/admin/change-requests
   */
  getAllChangeRequests: async (page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/employee-profile/admin/change-requests${query}`);
  },

  /**
   * Get single change request
   * GET /employee-profile/admin/change-requests/:requestId
   */
  getChangeRequest: async (requestId: string) => {
    return apiService.get(`/employee-profile/admin/change-requests/${requestId}`);
  },

  /**
   * Process (approve/reject) change request
   * PATCH /employee-profile/admin/change-requests/:requestId/process
   */
  processChangeRequest: async (requestId: string, data: any) => {
    return apiService.patch(`/employee-profile/admin/change-requests/${requestId}/process`, data);
  },

  /**
   * Get pending change requests count
   * GET /employee-profile/admin/change-requests/count/pending
   */
  getPendingChangeRequestsCount: async () => {
    return apiService.get(`/employee-profile/admin/change-requests/count/pending`);
  },

  /**
   * Get employee count by status
   * GET /employee-profile/admin/stats/by-status
   */
  getEmployeeCountByStatus: async () => {
    return apiService.get(`/employee-profile/admin/stats/by-status`);
  },

  /**
   * Get employee count by department
   * GET /employee-profile/admin/stats/by-department
   */
  getEmployeeCountByDepartment: async () => {
    return apiService.get(`/employee-profile/admin/stats/by-department`);
  },

  /**
   * Get employee profile (admin view)
   * GET /employee-profile/:id
   */
  getEmployeeProfile: async (id: string) => {
    return apiService.get(`/employee-profile/${id}`);
  },

  /**
   * Update employee profile (admin)
   * PATCH /employee-profile/:id
   */
  updateEmployeeProfile: async (id: string, data: any) => {
    return apiService.patch(`/employee-profile/${id}`, data);
  },

  /**
   * Deactivate employee
   * PATCH /employee-profile/:id/deactivate
   */
  deactivateEmployee: async (id: string, data?: any) => {
    return apiService.patch(`/employee-profile/${id}/deactivate`, data || {});
  },

  /**
   * Assign role to employee
   * PATCH /employee-profile/:id/role
   */
  assignRole: async (id: string, data: any) => {
    return apiService.patch(`/employee-profile/${id}/role`, data);
  },
};

