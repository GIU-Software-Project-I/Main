import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { NotificationLog, NotificationLogDocument } from '../../time-management/models/notification-log.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee/models/employee/employee-system-role.schema';
import { SystemRole, EmployeeStatus } from '../../employee/enums/employee-profile.enums';

@Injectable()
export class SharedLeavesService {
    private readonly logger = new Logger(SharedLeavesService.name);

    constructor(
        @InjectModel(NotificationLog.name) private notificationModel: Model<NotificationLogDocument>,
        @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(EmployeeSystemRole.name) private systemRoleModel: Model<EmployeeSystemRoleDocument>,
    ) {}

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    private async createNotification(to: Types.ObjectId | string, type: string, message: string): Promise<NotificationLog> {
        const toId = typeof to === 'string' ? new Types.ObjectId(to) : to;
        const notification = new this.notificationModel({ to: toId, type, message });
        return notification.save();
    }

    private async findUsersByRoles(roles: SystemRole[]): Promise<any[]> {
        try {
            const systemRoles = await this.systemRoleModel.find({ roles: { $in: roles }, isActive: true }).exec();
            if (!systemRoles.length) return [];
            const employeeIds = systemRoles.map(r => r.employeeProfileId);
            const employees = await this.employeeProfileModel.find({
                _id: { $in: employeeIds },
                status: { $ne: EmployeeStatus.TERMINATED },
            }).select('_id').exec();
            return systemRoles
                .map(role => {
                    const emp = employees.find(e => e._id.toString() === role.employeeProfileId?.toString());
                    return emp ? { employeeProfileId: role.employeeProfileId } : null;
                })
                .filter(Boolean);
        } catch (error) {
            this.logger.error('Failed to find users by roles', error);
            return [];
        }
    }

    private async notifyHRUsers(type: string, message: string): Promise<void> {
        const hrUsers = await this.findUsersByRoles([SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.HR_EMPLOYEE]);
        for (const user of hrUsers) {
            await this.createNotification(user.employeeProfileId, type, message);
        }
    }

    async sendLeaveRequestSubmittedNotification(employeeId: string, employeeName: string, leaveType: string, fromDate: Date, toDate: Date): Promise<void> {
        await this.createNotification(employeeId, 'N-050', `Your ${leaveType} leave request from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)} has been submitted.`);
    }

    async sendLeaveRequestApprovedNotification(employeeId: string, leaveType: string, fromDate: Date, toDate: Date): Promise<void> {
        await this.createNotification(employeeId, 'N-051', `Your ${leaveType} leave request from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)} has been approved.`);
    }

    async sendLeaveRequestRejectedNotification(employeeId: string, leaveType: string, fromDate: Date, toDate: Date, reason?: string): Promise<void> {
        const reasonStr = reason ? ` Reason: ${reason}` : '';
        await this.createNotification(employeeId, 'N-051', `Your ${leaveType} leave request from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)} has been rejected.${reasonStr}`);
    }

    async sendLeaveRequestCancelledNotification(employeeId: string, leaveType: string, fromDate: Date, toDate: Date): Promise<void> {
        await this.createNotification(employeeId, 'N-051', `Your ${leaveType} leave request from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)} has been cancelled.`);
    }

    async sendLeaveRequestReturnedForCorrectionNotification(employeeId: string, leaveType: string, fromDate: Date, toDate: Date, reason?: string): Promise<void> {
        const reasonStr = reason ? ` Reason: ${reason}` : '';
        await this.createNotification(employeeId, 'N-051', `Your ${leaveType} leave request from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)} has been returned for correction.${reasonStr}`);
    }

    async sendLeaveRequestModifiedNotification(employeeId: string, leaveType: string, fromDate: Date, toDate: Date, modifiedBy: string): Promise<void> {
        await this.createNotification(employeeId, 'N-051', `Your ${leaveType} leave request from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)} has been modified by ${modifiedBy}.`);
    }

    async sendManagerLeaveRequestNotification(managerId: string, employeeName: string, leaveType: string, fromDate: Date, toDate: Date): Promise<void> {
        await this.createNotification(managerId, 'N-052', `${employeeName} has submitted a ${leaveType} leave request from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)} for your review.`);
    }

    async sendLeaveRequestFinalizedNotification(employeeId: string, managerId: string, leaveType: string, fromDate: Date, toDate: Date, status: string): Promise<void> {
        const statusStr = status === 'approved' ? 'approved' : 'rejected';
        const dateRange = `${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`;
        
        // Notify employee (REQ-030)
        await this.createNotification(employeeId, 'N-053', `Your ${leaveType} leave request has been finalized and ${statusStr}.`);
        
        // Notify manager (REQ-030)
        if (managerId) {
            await this.createNotification(managerId, 'N-053', `Leave request for ${leaveType} from ${dateRange} has been finalized.`);
        }
        
        // Notify attendance coordinator and HR users (REQ-030)
        await this.notifyHRUsers('N-053', `Leave request finalized: ${leaveType} leave from ${dateRange} has been ${statusStr}. Please update attendance records accordingly.`);
    }

    async sendOverdueApprovalEscalationNotification(managerId: string, requestId: string, employeeName: string): Promise<void> {
        await this.createNotification(managerId, 'N-054', `Leave request from ${employeeName} (ID: ${requestId}) is overdue for approval (>48 hours).`);
        await this.notifyHRUsers('N-054', `Leave request (ID: ${requestId}) from ${employeeName} is pending manager approval for more than 48 hours.`);
    }

    async sendLeaveBalanceAdjustedNotification(employeeId: string, leaveType: string, adjustmentType: string, amount: number, reason: string): Promise<void> {
        const action = adjustmentType === 'add' ? 'added to' : 'deducted from';
        await this.createNotification(employeeId, 'N-055', `${amount} day(s) have been ${action} your ${leaveType} balance. Reason: ${reason}`);
    }

    async getEmployeeProfile(employeeId: string): Promise<{ fullName: string; status: string; dateOfHire: Date; contractType?: string } | null> {
        this.validateObjectId(employeeId, 'employeeId');
        const employee = await this.employeeProfileModel.findById(employeeId).select('fullName status dateOfHire contractType').exec();
        if (!employee) return null;
        return {
            fullName: employee.fullName || '',
            status: employee.status || '',
            dateOfHire: employee.dateOfHire,
            contractType: employee.contractType,
        };
    }

    async getEmployeeManager(employeeId: string): Promise<string | null> {
        this.validateObjectId(employeeId, 'employeeId');
        const employee = await this.employeeProfileModel.findById(employeeId).select('supervisorPositionId').exec();
        if (!employee?.supervisorPositionId) return null;
        const manager = await this.employeeProfileModel.findOne({
            primaryPositionId: employee.supervisorPositionId,
            status: { $ne: EmployeeStatus.TERMINATED },
        }).select('_id').exec();
        return manager?._id?.toString() || null;
    }

    async isEmployeeActive(employeeId: string): Promise<boolean> {
        this.validateObjectId(employeeId, 'employeeId');
        const employee = await this.employeeProfileModel.findById(employeeId).select('status').exec();
        if (!employee) return false;
        return employee.status !== EmployeeStatus.TERMINATED && employee.status !== EmployeeStatus.SUSPENDED;
    }

    async updateEmployeeStatusToOnLeave(employeeId: string): Promise<void> {
        this.validateObjectId(employeeId, 'employeeId');
        await this.employeeProfileModel.findByIdAndUpdate(employeeId, {
            status: EmployeeStatus.ON_LEAVE,
            statusEffectiveFrom: new Date(),
        });
    }

    async updateEmployeeStatusFromOnLeave(employeeId: string): Promise<void> {
        this.validateObjectId(employeeId, 'employeeId');
        const employee = await this.employeeProfileModel.findById(employeeId);
        if (employee && employee.status === EmployeeStatus.ON_LEAVE) {
            employee.status = EmployeeStatus.ACTIVE;
            employee.statusEffectiveFrom = new Date();
            await employee.save();
        }
    }

    async getEmployeeTenureMonths(employeeId: string): Promise<number> {
        this.validateObjectId(employeeId, 'employeeId');
        const employee = await this.employeeProfileModel.findById(employeeId).select('dateOfHire').exec();
        if (!employee?.dateOfHire) return 0;
        const hireDate = new Date(employee.dateOfHire);
        const now = new Date();
        const months = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
        return Math.max(0, months);
    }

    // ==================== TIME MANAGEMENT INTEGRATION ====================
    // REQ-010: Calendar & Blocked Days - Check if a date is a holiday/blocked day
    // REQ-042: Sync leave to Time Management - Block employee attendance record
    // REQ-042: Get actual service days excluding unpaid leave
    // REQ-042: Get unpaid leave periods for accrual suspension

    async syncLeaveWithTimeManagement(employeeId: string, fromDate: Date, toDate: Date, leaveType: string, status: 'approved' | 'cancelled'): Promise<void> {
        this.logger.log(`[TIME_MGMT_SYNC] Employee: ${employeeId}, Leave: ${leaveType}, From: ${fromDate.toISOString().slice(0, 10)}, To: ${toDate.toISOString().slice(0, 10)}, Status: ${status}`);
        this.logger.log(`[TIME_MGMT_SYNC] Action: ${status === 'approved' ? 'Blocking attendance records for leave period' : 'Unblocking attendance records (leave cancelled)'}`);
    }

    async syncLeaveWithPayroll(employeeId: string, leaveData: {
        leaveRequestId: string;
        leaveTypeId: string;
        durationDays: number;
        isPaid: boolean;
        from: Date;
        to: Date;
    }): Promise<void> {
        this.logger.log(`[PAYROLL_SYNC] Employee: ${employeeId}, Leave ID: ${leaveData.leaveRequestId}, Days: ${leaveData.durationDays}, Paid: ${leaveData.isPaid}`);
        this.logger.log(`[PAYROLL_SYNC] Period: ${leaveData.from.toISOString().slice(0, 10)} to ${leaveData.to.toISOString().slice(0, 10)}`);
    }

    async isHoliday(date: Date): Promise<boolean> {
        this.logger.log(`[TIME_MGMT] Checking if ${date.toISOString().slice(0, 10)} is a holiday`);
        return false;
    }

    async isBlockedPeriod(date: Date): Promise<boolean> {
        this.logger.log(`[TIME_MGMT] Checking if ${date.toISOString().slice(0, 10)} is in a blocked period`);
        return false;
    }

    async getHolidaysInRange(fromDate: Date, toDate: Date): Promise<Date[]> {
        this.logger.log(`[TIME_MGMT] Getting holidays from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`);
        return [];
    }

    async getBlockedPeriodsInRange(fromDate: Date, toDate: Date): Promise<{ from: Date; to: Date; reason: string }[]> {
        this.logger.log(`[TIME_MGMT] Getting blocked periods from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`);
        return [];
    }

    async getEmployeeWorkSchedule(employeeId: string): Promise<{ workDays: number[]; weeklyHours: number }> {
        this.logger.log(`[TIME_MGMT] Getting work schedule for employee: ${employeeId}`);
        return { workDays: [1, 2, 3, 4, 5], weeklyHours: 40 };
    }

    async isWorkDay(employeeId: string, date: Date): Promise<boolean> {
        this.logger.log(`[TIME_MGMT] Checking if ${date.toISOString().slice(0, 10)} is a work day for employee: ${employeeId}`);
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
    }

    async getWorkingDaysCount(employeeId: string, fromDate: Date, toDate: Date): Promise<number> {
        this.logger.log(`[TIME_MGMT] Calculating working days for employee: ${employeeId} from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`);
        let count = 0;
        const current = new Date(fromDate);
        while (current <= toDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    }

    async getActualServiceDays(employeeId: string, fromDate: Date, toDate: Date): Promise<number> {
        this.logger.log(`[TIME_MGMT] Getting actual service days for employee: ${employeeId} from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`);
        return this.getWorkingDaysCount(employeeId, fromDate, toDate);
    }

    async getUnpaidLeavePeriods(employeeId: string, fromDate: Date, toDate: Date): Promise<{ from: Date; to: Date }[]> {
        this.logger.log(`[TIME_MGMT] Getting unpaid leave periods for employee: ${employeeId} from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`);
        return [];
    }

    async getEmployeeRestDays(employeeId: string): Promise<number[]> {
        this.logger.log(`[TIME_MGMT] Getting rest days for employee: ${employeeId}`);
        return [0, 6];
    }

    async calculateLeaveDaysExcludingHolidays(employeeId: string, fromDate: Date, toDate: Date): Promise<number> {
        this.logger.log(`[TIME_MGMT] Calculating leave days excluding holidays for employee: ${employeeId}`);
        return this.getWorkingDaysCount(employeeId, fromDate, toDate);
    }

    async pauseAccrualForUnpaidLeave(employeeId: string, fromDate: Date, toDate: Date): Promise<void> {
        this.logger.log(`[ACCRUAL] Pausing accrual for employee: ${employeeId} from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`);
    }

    async resumeAccrualAfterUnpaidLeave(employeeId: string, resumeDate: Date): Promise<void> {
        this.logger.log(`[ACCRUAL] Resuming accrual for employee: ${employeeId} from ${resumeDate.toISOString().slice(0, 10)}`);
    }
}
