
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UnifiedLeaveService } from '../services/leaves.service';
import { CreateLeaveTypeDto } from '../dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from '../dto/update-leave-type.dto';
import { CreateLeaveCategoryDto } from '../dto/create-leave-category.dto';
import { AdjustBalanceDto } from '../dto/adjust-balance.dto';
import { CreateEntitlementDto } from '../dto/create-entitlement.dto';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { CreateLeavePolicyDto } from '../dto/create-leave-policy.dto';
import { AccrualMethod } from '../enums/accrual-method.enum';
import { RoundingRule } from '../enums/rounding-rule.enum';
import { AuthenticationGuard } from '../../auth/guards/authentication-guard';
import { AuthorizationGuard } from '../../auth/guards/authorization-guard';
import { Roles } from '../../auth/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';

@Controller('leaves')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class UnifiedLeaveController {
  constructor(private readonly service: UnifiedLeaveService) { }

  // -------------------------
  // Leave Types (REQ-006: HR Admin creates and manages leave types)
  // -------------------------

  @Get('employees/:employeeId/leave-usage')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getLeaveUsageLastYears(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId: string,
    @Query('years') years?: string,
  ) {
    const yearsNum = years ? Number(years) : 3;
    return this.service.getLeaveUsageLastYears(employeeId, leaveTypeId, yearsNum);
  }

  @Get('employees/:employeeId/leave-count')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getLeaveCountForType(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId: string,
  ) {
    return this.service.getLeaveCountForType(employeeId, leaveTypeId);
  }

  @Post('types')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async createLeaveType(@Body() dto: CreateLeaveTypeDto) {
    return this.service.createLeaveType(dto);
  }

  @Get('types')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getAllLeaveTypes() {
    return this.service.getAllLeaveTypes();
  }

  @Get('types/:id')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getLeaveType(@Param('id') id: string) {
    return this.service.getLeaveType(id);
  }

  @Put('types/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async updateLeaveType(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.service.updateLeaveType(id, dto);
  }

  @Delete('types/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async deleteLeaveType(@Param('id') id: string) {
    return this.service.deleteLeaveType(id);
  }

  // -------------------------
  // Leave Eligibility (REQ-007: HR Admin sets eligibility rules)
  // -------------------------
  @Patch('types/:id/eligibility')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async setEligibility(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateLeaveType(id, { eligibility: body });
  }

  // -------------------------
  // Leave Categories
  // -------------------------
  @Post('categories')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async createCategory(@Body() dto: CreateLeaveCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Get('categories')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getAllCategories() {
    return this.service.getAllCategories();
  }

  @Get('categories/:id')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getCategory(@Param('id') id: string) {
    return this.service.getCategory(id);
  }

  @Put('categories/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLeaveCategoryDto>,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }

  // -------------------------
  // Leave Requests (REQ-015 - REQ-031: Employees submit, managers review, HR finalizes)
  // -------------------------
  @Post('requests')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async createRequest(@Body() dto: CreateLeaveRequestDto) {
    return this.service.createLeaveRequest(dto as any);
  }

  @Get('requests')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getAllRequests(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getAllRequests({
      page,
      limit,
      employeeId,
      status,
      leaveTypeId,
      from,
      to,
    });
  }

  @Get('requests/overdue')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getOverdueRequests(@Query('hours') hours?: string) {
    const hoursNum = hours ? Number(hours) : 48;
    return this.service.getOverdueRequests(hoursNum);
  }

  @Get('requests/:id')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getRequest(@Param('id') id: string) {
    return this.service.getRequest(id);
  }

  @Patch('requests/:id')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async updateRequest(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLeaveRequestDto>,
  ) {
    return this.service.updateRequest(id, dto as any);
  }

  @Patch('requests/:id/cancel')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async cancelRequest(
    @Param('id') id: string,
    @Query('employeeId') employeeId: string,
  ) {
    return this.service.cancelRequest(id, employeeId);
  }

  @Patch('requests/:id/manager-approve')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async managerApprove(
    @Param('id') id: string,
    @Query('managerId') managerId: string,
  ) {
    return this.service.managerApprove(id, managerId);
  }

  @Patch('requests/:id/manager-reject')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async managerReject(
    @Param('id') id: string,
    @Query('managerId') managerId: string,
    @Query('reason') reason?: string,
  ) {
    return this.service.managerReject(id, managerId, reason);
  }

  @Patch('requests/:id/hr-finalize')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async hrFinalize(
    @Param('id') id: string,
    @Query('hrId') hrId: string,
    @Query('decision') decision: 'approve' | 'reject',
    @Query('allowNegative') allowNegative?: string,
  ) {
    const allow = allowNegative === 'true';
    return this.service.hrFinalize(id, hrId, decision, allow);
  }

  // -------------------------
  // Leave Adjustments (REQ-013: HR Admin manual balance adjustment)
  // -------------------------
  @Post('adjustments')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async createAdjustment(@Body() dto: AdjustBalanceDto) {
    return this.service.createAdjustment(dto as any);
  }

  // -------------------------
  // Entitlements (REQ-008: HR Admin assigns personalized entitlements)
  // -------------------------
  @Post('entitlements')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async createEntitlement(@Body() dto: CreateEntitlementDto) {
    return this.service.createEntitlement(dto);
  }

  @Get('entitlements/:employeeId')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getEntitlements(@Param('employeeId') employeeId: string) {
    return this.service.getEntitlements(employeeId);
  }

  @Post('entitlements/assign')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async assignEntitlement(
    @Body() body: { employeeId: string; leaveTypeId: string; yearlyEntitlement: number },
  ) {
    return this.service.assignEntitlement(
      body.employeeId,
      body.leaveTypeId,
      body.yearlyEntitlement,
    );
  }

  // -------------------------
  // Employee Self-Service Views (REQ-031 - REQ-033)
  // -------------------------
  @Get('employees/:employeeId/balances')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getEmployeeBalances(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeBalances(employeeId);
  }

  @Get('employees/:employeeId/history')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Query()
    query: {
      leaveTypeId?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
  ) {
    return this.service.getEmployeeHistory(employeeId, query);
  }

  // -------------------------
  // Manager Views (REQ-034 - REQ-039)
  // -------------------------
  @Get('manager/:managerId/team-balances')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async teamBalances(
    @Param('managerId') managerId: string,
    @Query('department') department?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return this.service.teamBalances(managerId, { department, leaveTypeId });
  }

  @Get('manager/:managerId/team-requests')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async teamRequests(
    @Param('managerId') managerId: string,
    @Query()
    query: {
      leaveTypeId?: string;
      status?: string;
      department?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
  ) {
    return this.service.teamRequests(managerId, query);
  }

  @Get('manager/:managerId/irregular-patterns')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async irregularPatterns(
    @Param('managerId') managerId: string,
    @Query('department') department?: string,
  ) {
    return this.service.irregularPatterns(managerId, { department });
  }

  @Post('manager/flag-irregular/:requestId')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async flagIrregular(
    @Param('requestId') requestId: string,
    @Body() body: { flag: boolean; reason?: string },
  ) {
    return this.service.flagIrregular(
      requestId,
      body.flag ?? true,
      body.reason,
    );
  }

  // -------------------------
  // Calendar / Holidays / Blocked Periods (REQ-010)
  // -------------------------
  @Post('calendar/holidays')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async addHoliday(
    @Body()
    body: { year: number; date: string; reason?: string },
  ) {
    const year = Number(body.year);
    const date = new Date(body.date);
    return this.service.addHoliday(year, date, body.reason);
  }

  @Post('calendar/blocked-periods')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async addBlockedPeriod(
    @Body()
    body: { year: number; from: string; to: string; reason: string },
  ) {
    const year = Number(body.year);
    const from = new Date(body.from);
    const to = new Date(body.to);
    return this.service.addBlockedPeriod(year, from, to, body.reason);
  }

  @Get('calendar/:year')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getCalendar(@Param('year') year: string) {
    return this.service.getCalendar(Number(year));
  }

  // -------------------------
  // Accruals (REQ-040 - REQ-042)
  // -------------------------
  @Post('accruals/run')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async runAccrual(
    @Query('referenceDate') referenceDate?: string,
    @Body()
    body?: {
      method?: AccrualMethod;
      roundingRule?: RoundingRule;
    },
  ) {
    const method = body?.method ?? AccrualMethod.MONTHLY;
    const roundingRule = body?.roundingRule ?? RoundingRule.ROUND;
    return this.service.runAccrual(referenceDate, method, roundingRule);
  }

  @Post('accruals/carryforward')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async carryForward(
    @Query('referenceDate') referenceDate?: string,
    @Body()
    body?: {
      capDays?: number;
      expiryMonths?: number;
    },
  ) {
    const capDays = body?.capDays;
    const expiryMonths = body?.expiryMonths;
    return this.service.carryForward(referenceDate, capDays, expiryMonths);
  }

  @Get('accruals/employee/:id/recalc')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async recalcEmployee(@Param('id') id: string) {
    return this.service.recalcEmployee(id);
  }

  @Post('accruals/reset-year')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async resetLeaveYear(
    @Body()
    body: {
      strategy: 'hireDate' | 'calendarYear' | 'custom';
      referenceDate?: string;
    },
  ) {
    const referenceDate = body.referenceDate
      ? new Date(body.referenceDate)
      : undefined;
    return this.service.resetLeaveYear(body.strategy, referenceDate);
  }

  @Post('accruals/adjust-suspension')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async adjustSuspension(
    @Body()
    body: { employeeId: string; fromDate: string; toDate: string; reason?: string },
  ) {
    const { employeeId, fromDate, toDate, reason } = body;
    const serviceDays = await this.service.calculateServiceDays(
      employeeId,
      new Date(fromDate),
      new Date(toDate),
    );
    return { employeeId, fromDate, toDate, serviceDays, reason };
  }

  // -------------------------
  // Attachments (REQ-016, REQ-028)
  // -------------------------
  @Post('attachments')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async saveAttachment(@Body() dto: any) {
    return this.service.saveAttachment(dto);
  }

  @Get('attachments/:id/validate-medical')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async validateMedicalAttachment(@Param('id') id: string) {
    return this.service.validateMedicalAttachment(id);
  }

  // -------------------------
  // Bulk Processing (REQ-027)
  // -------------------------
  @Post('requests/bulk-process')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async bulkProcessRequests(
    @Body()
    body: { requestIds: string[]; action: 'approve' | 'reject'; actorId: string },
  ) {
    return this.service.bulkProcessRequests(
      body.requestIds,
      body.action,
      body.actorId,
    );
  }

  // -------------------------
  // Payroll Integration (REQ-042)
  // -------------------------
  @Post('payroll/sync-balance')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
  async payrollSyncBalance(
    @Body() body: { employeeId: string; balanceData?: any },
  ) {
    return this.service.payrollSyncBalance(
      body.employeeId,
      body.balanceData,
    );
  }

  @Post('payroll/sync-leave-approval')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
  async payrollSyncLeave(@Body() body: { employeeId: string; leaveData: any }) {
    return this.service.payrollSyncLeave(body.employeeId, body.leaveData);
  }

  @Post('payroll/calculate-unpaid-deduction')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
  async calculateUnpaidDeduction(
    @Body()
    body: {
      employeeId: string;
      baseSalary: number;
      workDaysInMonth: number;
      unpaidLeaveDays: number;
    },
  ) {
    return this.service.calculateUnpaidDeduction(
      body.employeeId,
      body.baseSalary,
      body.workDaysInMonth,
      body.unpaidLeaveDays,
    );
  }

  @Post('payroll/calculate-encashment')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
  async calculateEncashment(
    @Body()
    body: {
      employeeId: string;
      dailySalaryRate: number;
      unusedLeaveDays: number;
      maxEncashableDays?: number;
    },
  ) {
    return this.service.calculateEncashment(
      body.employeeId,
      body.dailySalaryRate,
      body.unusedLeaveDays,
      body.maxEncashableDays,
    );
  }

  @Post('payroll/sync-cancellation')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
  async syncCancellation(
    @Body()
    body: {
      employeeId: string;
      leaveRequestId: string;
      daysToRestore: number;
    },
  ) {
    return this.service.syncCancellation(
      body.employeeId,
      body.leaveRequestId,
      body.daysToRestore,
    );
  }

  // -------------------------
  // Leave Policies (REQ-001 - REQ-009)
  // -------------------------
  @Post('policies')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async createPolicy(@Body() dto: CreateLeavePolicyDto) {
    return this.service.createPolicy(dto);
  }

  @Get('policies')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getAllPolicies() {
    return this.service.getAllPolicies();
  }

  @Get('policies/:id')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getPolicy(@Param('id') id: string) {
    return this.service.getPolicy(id);
  }

  @Get('policies/by-leave-type/:leaveTypeId')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getPolicyByLeaveType(@Param('leaveTypeId') leaveTypeId: string) {
    return this.service.getPolicyByLeaveType(leaveTypeId);
  }

  @Put('policies/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async updatePolicy(@Param('id') id: string, @Body() dto: Partial<CreateLeavePolicyDto>) {
    return this.service.updatePolicy(id, dto);
  }

  @Delete('policies/:id')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async deletePolicy(@Param('id') id: string) {
    return this.service.deletePolicy(id);
  }

  // -------------------------
  // Statistics and Reports
  // -------------------------
  @Get('stats')
  @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getLeaveStats(
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.getLeaveStats(employeeId, departmentId);
  }

  @Get('employees/:employeeId/entitlement-summary')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getEntitlementSummary(@Param('employeeId') employeeId: string) {
    return this.service.getEntitlementSummary(employeeId);
  }

  @Get('manager/:managerId/pending-count')
  @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getPendingApprovalsCount(@Param('managerId') managerId: string) {
    return this.service.getPendingApprovalsCount(managerId);
  }


  @Post('requests/escalate-overdue')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async escalateOverdue() {
    return this.service.checkAndEscalateOverdue();
  }

  // -------------------------
  // Calendar Extended
  // -------------------------
  @Put('calendar/:year')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async updateCalendar(
    @Param('year') year: string,
    @Body() body: { holidays?: string[]; blockedPeriods?: any[] },
  ) {
    const holidays = body.holidays?.map(d => new Date(d));
    return this.service.updateCalendar(Number(year), { holidays, blockedPeriods: body.blockedPeriods });
  }

  @Delete('calendar/:year/holidays')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async removeHoliday(
    @Param('year') year: string,
    @Body() body: { date: string },
  ) {
    return this.service.removeHoliday(Number(year), new Date(body.date));
  }

  @Delete('calendar/:year/blocked-periods')
  @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async removeBlockedPeriod(
    @Param('year') year: string,
    @Body() body: { from: string; to: string },
  ) {
    return this.service.removeBlockedPeriod(Number(year), new Date(body.from), new Date(body.to));
  }

  // -------------------------
  // Attachments Extended
  // -------------------------
  @Get('attachments/:id')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getAttachment(@Param('id') id: string) {
    return this.service.getAttachment(id);
  }

  @Delete('attachments/:id')
  @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async deleteAttachment(@Param('id') id: string) {
    return this.service.deleteAttachment(id);
  }

  // -------------------------
  // Adjustment History
  // -------------------------
  @Get('employees/:employeeId/adjustment-history')
  @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
  async getAdjustmentHistory(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return this.service.getAdjustmentHistory(employeeId, leaveTypeId);
  }
}
