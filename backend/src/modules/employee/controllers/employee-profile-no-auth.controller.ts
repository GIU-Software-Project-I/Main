// filepath: d:\WebstormProjects\HR System\Main\backend\src\modules\employee\controllers\employee-profile-no-auth.controller.ts
// TEMPORARY CONTROLLER WITHOUT AUTHORIZATION - FOR TESTING PURPOSES ONLY
// Remove this file and uncomment the original controller in production

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UpdateContactInfoDto } from '../dto/employee-profile/update-contact-info.dto';
import { UpdateBioDto } from '../dto/employee-profile/update-bio.dto';
import { CreateCorrectionRequestDto } from '../dto/employee-profile/create-correction-request.dto';
import { AdminUpdateProfileDto } from '../dto/employee-profile/admin-update-profile.dto';
import { AdminAssignRoleDto } from '../dto/employee-profile/admin-assign-role.dto';
import { SearchEmployeesDto, PaginationQueryDto } from '../dto/employee-profile/search-employees.dto';
import { ProcessChangeRequestDto } from '../dto/employee-profile/process-change-request.dto';
import { ProfileChangeStatus } from '../enums/employee-profile.enums';
import { EmployeeProfileService } from '../services/employee-profile.service';
import { EmployeeDocumentService } from '../services/employee-document.service';
import { UploadDocumentDto } from '../dto/employee-profile/upload-document.dto';

@Controller('employee-profile')
export class EmployeeProfileNoAuthController {
    constructor(
        private readonly employeeProfileService: EmployeeProfileService,
        private readonly employeeDocumentService: EmployeeDocumentService,
    ) { }

    // ==========================================
    // EMPLOYEE SELF-SERVICE ROUTES
    // ==========================================

    // US-E2-04: View personal profile
    @Get('me/:userId')
    async getMyProfile(@Param('userId') userId: string) {
        return this.employeeProfileService.getProfile(userId);
    }

    // US-E2-05: Update contact information (immediate update, no approval needed)
    @Patch('me/:userId/contact-info')
    async updateContactInfo(@Param('userId') userId: string, @Body() dto: UpdateContactInfoDto) {
        return this.employeeProfileService.updateContactInfo(userId, dto);
    }

    // US-E2-12: Update bio and profile picture (immediate update, no approval needed)
    @Patch('me/:userId/bio')
    async updateBio(@Param('userId') userId: string, @Body() dto: UpdateBioDto) {
        return this.employeeProfileService.updateBio(userId, dto);
    }

    // US-E6-02: Submit correction request for critical data (requires approval)
    @Post('me/:userId/correction-request')
    async createCorrectionRequest(@Param('userId') userId: string, @Body() dto: CreateCorrectionRequestDto) {
        return this.employeeProfileService.createCorrectionRequest(userId, dto);
    }

    // View own correction requests
    @Get('me/:userId/correction-requests')
    async getMyChangeRequests(@Param('userId') userId: string, @Query() queryDto: PaginationQueryDto) {
        return this.employeeProfileService.getMyChangeRequests(userId, queryDto);
    }

    // Cancel own pending correction request
    @Patch('me/:userId/correction-requests/:requestId/cancel')
    async cancelMyChangeRequest(@Param('userId') userId: string, @Param('requestId') requestId: string) {
        return this.employeeProfileService.cancelMyChangeRequest(userId, requestId);
    }

    // ==========================================
    // DOCUMENT MANAGEMENT ROUTES
    // ==========================================

    // Upload a document
    @Post('me/:userId/documents')
    async uploadDocument(@Param('userId') userId: string, @Body() dto: UploadDocumentDto) {
        return this.employeeDocumentService.uploadDocument(userId, dto);
    }

    // Get all my documents
    @Get('me/:userId/documents')
    async getMyDocuments(@Param('userId') userId: string) {
        return this.employeeDocumentService.getMyDocuments(userId);
    }

    // Get a specific document
    @Get('me/:userId/documents/:documentId')
    async getDocument(@Param('userId') userId: string, @Param('documentId') documentId: string) {
        return this.employeeDocumentService.getDocument(userId, documentId);
    }

    // Delete a document
    @Delete('me/:userId/documents/:documentId')
    async deleteDocument(@Param('userId') userId: string, @Param('documentId') documentId: string) {
        await this.employeeDocumentService.deleteDocument(userId, documentId);
        return { message: 'Document deleted successfully' };
    }

    // ==========================================
    // EMERGENCY CONTACT MANAGEMENT ROUTES
    // ==========================================

    // Get all emergency contacts
    @Get('me/:userId/emergency-contacts')
    async getEmergencyContacts(@Param('userId') userId: string) {
        return this.employeeProfileService.getEmergencyContacts(userId);
    }

    // Add emergency contact
    @Post('me/:userId/emergency-contacts')
    async addEmergencyContact(@Param('userId') userId: string, @Body() dto: any) {
        return this.employeeProfileService.addEmergencyContact(userId, dto);
    }

    // Update emergency contact
    @Patch('me/:userId/emergency-contacts/:index')
    async updateEmergencyContact(
        @Param('userId') userId: string,
        @Param('index') index: string,
        @Body() dto: any
    ) {
        return this.employeeProfileService.updateEmergencyContact(userId, parseInt(index), dto);
    }

    // Delete emergency contact
    @Delete('me/:userId/emergency-contacts/:index')
    async deleteEmergencyContact(@Param('userId') userId: string, @Param('index') index: string) {
        return this.employeeProfileService.deleteEmergencyContact(userId, parseInt(index));
    }

    // ==========================================
    // DEPARTMENT MANAGER ROUTES (Team View)
    // ==========================================

    // US-E4-01, US-E4-02: View team members profiles (non-sensitive)
    @Get('team/:managerId')
    async getTeamProfiles(@Param('managerId') managerId: string) {
        return this.employeeProfileService.getTeamProfiles(managerId);
    }

    // US-E4-01, US-E4-02: View team members profiles with pagination
    @Get('team/:managerId/paginated')
    async getTeamProfilesPaginated(@Param('managerId') managerId: string, @Query() queryDto: PaginationQueryDto) {
        return this.employeeProfileService.getTeamProfilesPaginated(managerId, queryDto);
    }

    // ==========================================
    // HR ADMIN ROUTES
    // ==========================================

    // US-E6-03: Get all employees (with optional filters)
    @Get('admin/employees')
    async getAllEmployees(@Query() queryDto: SearchEmployeesDto) {
        return this.employeeProfileService.getAllEmployees(queryDto);
    }

    // US-E6-03: Search employees
    @Get('admin/search')
    async searchEmployees(@Query() queryDto: SearchEmployeesDto) {
        return this.employeeProfileService.searchEmployees(queryDto);
    }

    // US-E2-03: Get all change requests (for HR review)
    @Get('admin/change-requests')
    async getChangeRequests(
        @Query('status') status?: ProfileChangeStatus,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.employeeProfileService.getChangeRequests(status, page || 1, limit || 20);
    }

    // Get pending change requests count (for dashboard)
    @Get('admin/change-requests/count/pending')
    async getPendingChangeRequestsCount() {
        const count = await this.employeeProfileService.getPendingChangeRequestsCount();
        return { count };
    }

    // Get specific change request details
    @Get('admin/change-requests/:requestId')
    async getChangeRequestById(@Param('requestId') requestId: string) {
        return this.employeeProfileService.getChangeRequestById(requestId);
    }

    // US-E2-03: Process change request (approve/reject)
    @Patch('admin/change-requests/:requestId/process')
    async processChangeRequest(
        @Param('requestId') requestId: string,
        @Body() dto: ProcessChangeRequestDto,
        @Query('adminUserId') adminUserId?: string
    ) {
        return this.employeeProfileService.processChangeRequest(requestId, dto.status, adminUserId, dto.rejectionReason);
    }

    // Statistics: Employee count by status
    @Get('admin/stats/by-status')
    async getEmployeeCountByStatus() {
        return this.employeeProfileService.getEmployeeCountByStatus();
    }

    // Statistics: Employee count by department
    @Get('admin/stats/by-department')
    async getEmployeeCountByDepartment() {
        return this.employeeProfileService.getEmployeeCountByDepartment();
    }

    // US-EP-04: Get any employee profile (admin view with full details)
    @Get(':id')
    async getProfile(@Param('id') id: string) {
        return this.employeeProfileService.adminGetProfile(id);
    }

    // US-EP-04: Update any employee profile (admin)
    @Patch(':id')
    async updateProfile(@Param('id') id: string, @Body() dto: AdminUpdateProfileDto) {
        return this.employeeProfileService.adminUpdateProfile(id, dto);
    }

    // US-EP-05: Deactivate employee (termination/resignation)
    @Patch(':id/deactivate')
    async deactivateEmployee(@Param('id') id: string) {
        return this.employeeProfileService.adminDeactivateEmployee(id);
    }

    // US-E7-05: Assign role/access profile to employee
    @Patch(':id/role')
    async assignRole(@Param('id') id: string, @Body() dto: AdminAssignRoleDto) {
        return this.employeeProfileService.adminAssignRole(id, dto);
    }
}
