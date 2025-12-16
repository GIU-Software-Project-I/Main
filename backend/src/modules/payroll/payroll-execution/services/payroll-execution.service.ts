import { Injectable, BadRequestException, ForbiddenException, Optional, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { employeeSigningBonus, employeeSigningBonusDocument } from '../models/EmployeeSigningBonus.schema';
import { payrollRuns, payrollRunsDocument } from '../models/payrollRuns.schema';
import { paySlip } from '../models/payslip.schema';
import { employeePayrollDetails } from '../models/employeePayrollDetails.schema';
import { BonusStatus, BenefitStatus, PayRollStatus, PayRollPaymentStatus, PaySlipPaymentStatus, BankStatus } from '../enums/payroll-execution-enum';
import { EmployeeTerminationResignation, EmployeeTerminationResignationDocument } from '../models/EmployeeTerminationResignation.schema';
import { SystemRole } from '../../../employee/enums/employee-profile.enums';
import { PayCalculatorService } from '../services/payCalculator.service';
import { AttendanceService } from '../../../time-management/services/AttendanceService';
import { UnifiedLeaveService } from '../../../leaves/services/leaves.service';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../../employee/models/employee/employee-system-role.schema';
import {EmployeeProfileService} from "../../../employee/services/employee-profile.service";
import { AttendanceRecord, AttendanceRecordDocument } from '../../../time-management/models/attendance-record.schema';
import { SharedPayrollService } from '../../../shared/services/shared-payroll.service';
import { stat } from 'fs';

@Injectable()
export class PayrollExecutionService {
    constructor(
        @InjectModel(employeeSigningBonus.name)
        private employeeSigningBonusModel: Model<employeeSigningBonusDocument>,
        @InjectModel(EmployeeTerminationResignation.name)
        private employeeTerminationResignationModel: Model<EmployeeTerminationResignationDocument>,
        @InjectModel(payrollRuns.name)
        private payrollRunsModel: Model<payrollRunsDocument>,
        @InjectModel(paySlip.name)
        private paySlipModel: Model<any>,
        @InjectModel(employeePayrollDetails.name)
        private employeePayrollDetailsModel: Model<any>,
        @InjectModel(AttendanceRecord.name)
        private attendanceRecordModel: Model<AttendanceRecordDocument>,
        private readonly payCalculator: PayCalculatorService,
        @InjectConnection()
        private readonly connection: Connection,
        @Optional() private readonly employeeService?: EmployeeProfileService,
        @Optional() private readonly attendanceService?: AttendanceService,
        @Optional() private readonly leavesService?: UnifiedLeaveService,
        @Optional() private readonly sharedPayrollService?: SharedPayrollService,
        @Optional() @InjectModel(EmployeeSystemRole.name) private readonly employeeSystemRoleModel?: Model<EmployeeSystemRoleDocument>,
    ) {}

    private get db() {
        return (this.connection && this.connection.db) ? this.connection.db : (mongoose && mongoose.connection && (mongoose.connection.db as any)) || null;
    }

    private readonly terminationCollectionName = 'employeeterminationresignations';

    // Helper method to ensure user has specific role
    private async ensureRole(userId: string | any, requiredRole: SystemRole, operationName: string): Promise<void> {
        if (!userId) throw new ForbiddenException(`${operationName} requires authentication`);
        
        const db = this.db;
        if (!db) throw new BadRequestException('Database unavailable');

        try {
            const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
            
            if (this.employeeSystemRoleModel) {
                const roleDoc = await this.employeeSystemRoleModel.findOne({ 
                    employeeProfileId: uid, 
                    isActive: true 
                }).lean().exec();
                
                if (!roleDoc || !Array.isArray(roleDoc.roles) || !roleDoc.roles.includes(requiredRole)) {
                    throw new ForbiddenException(`User does not have required role: ${requiredRole}`);
                }
                return;
            }

            // Fallback to raw DB query
            const row = await db.collection('employee_system_roles').findOne({ 
                employeeProfileId: uid,
                isActive: true 
            });
            
            if (!row || !Array.isArray(row.roles) || !row.roles.includes(requiredRole)) {
                throw new ForbiddenException(`User does not have required role: ${requiredRole}`);
            }
        } catch (e) {
            if (e instanceof ForbiddenException) throw e;
            throw new ForbiddenException(`Authorization check failed: ${e.message}`);
        }
    }

    private async ensurePayrollSpecialist(userId?: string | any): Promise<void> {
        await this.ensureRole(userId, SystemRole.PAYROLL_SPECIALIST, 'This operation');
    }

    private async ensurePayrollManager(userId?: string | any): Promise<void> {
        await this.ensureRole(userId, SystemRole.PAYROLL_MANAGER, 'Manager approval');
    }

    private async ensureFinanceStaff(userId?: string | any): Promise<void> {
        await this.ensureRole(userId, SystemRole.FINANCE_STAFF, 'Finance approval');
    }

    // Helper to validate approver exists, is active, and is not the creator (prevents self-approval)
    private async validateApprover(approverId: string, creatorId?: mongoose.Types.ObjectId | string): Promise<void> {
        // 1. Validate approver ID format
        if (!approverId || !mongoose.Types.ObjectId.isValid(approverId)) {
            throw new BadRequestException('Invalid approver ID');
        }

        // 2. Validate approver exists in Employee collection
        const db = this.db;
        if (!db) throw new BadRequestException('Database unavailable');

        const approver = await db.collection('employee_profiles').findOne({ 
            _id: new mongoose.Types.ObjectId(approverId) 
        });
        
        if (!approver) {
            throw new BadRequestException('Approver employee not found');
        }

        // 3. Validate approver is ACTIVE
        if (approver.status !== 'ACTIVE') {
            throw new BadRequestException('Approver must be an active employee');
        }

        // 4. Prevent self-approval
        if (creatorId) {
            const creatorIdStr = typeof creatorId === 'string' ? creatorId : creatorId.toString();
            if (creatorIdStr === approverId) {
                throw new ForbiddenException(
                    'Self-approval not allowed. Record must be approved by a different user.'
                );
            }
        }
    }

    // Helper to validate employee exists and has active contract
    // Helper to get attendance data from Time Management module
    private async getAttendanceData(employeeId: any, periodStart: Date, periodEnd: Date): Promise<{
        actualWorkMinutes: number;
        scheduledWorkMinutes: number;
        overtimeMinutes: number;
        latenessMinutes: number;
        missingWorkMinutes: number;
        workingDays: number;
    }> {
        try {
            if (!this.attendanceRecordModel) {
                return {
                    actualWorkMinutes: 0,
                    scheduledWorkMinutes: 0,
                    overtimeMinutes: 0,
                    latenessMinutes: 0,
                    missingWorkMinutes: 0,
                    workingDays: 0
                };
            }

            const empId = new mongoose.Types.ObjectId(employeeId);
            
            // Get all attendance records for the period
            const records = await this.attendanceRecordModel.find({
                employeeId: empId,
                date: { $gte: periodStart, $lte: periodEnd }
            }).lean().exec();

            let totalActualMinutes = 0;
            let totalScheduledMinutes = 0;
            let totalOvertimeMinutes = 0;
            let totalLatenessMinutes = 0;
            let workingDaysCount = 0;

            for (const record of records) {
                // Attendance schema may not have strong typing for overtime/lateness; fallback to 0
                const overtime = (record as any).overtimeMinutes ?? 0;
                const lateness = (record as any).latenessMinutes ?? 0;

                totalActualMinutes += record.totalWorkMinutes || 0;
                totalOvertimeMinutes += overtime;
                totalLatenessMinutes += lateness;
                
                // Get scheduled minutes using attendance service if available
                if (this.attendanceService && typeof (this.attendanceService as any).scheduledMinutesForRecord === 'function') {
                    const scheduled = await (this.attendanceService as any).scheduledMinutesForRecord(record);
                    totalScheduledMinutes += scheduled || 0;
                } else {
                    // Default to 8 hours per day
                    totalScheduledMinutes += 480;
                }
                
                if (record.totalWorkMinutes > 0) {
                    workingDaysCount++;
                }
            }

            const missingMinutes = Math.max(0, totalScheduledMinutes - totalActualMinutes);

            return {
                actualWorkMinutes: totalActualMinutes,
                scheduledWorkMinutes: totalScheduledMinutes,
                overtimeMinutes: totalOvertimeMinutes,
                latenessMinutes: totalLatenessMinutes,
                missingWorkMinutes: missingMinutes,
                workingDays: workingDaysCount
            };
        } catch (err) {
            console.error(`Error getting attendance data for employee ${employeeId}:`, err);
            return {
                actualWorkMinutes: 0,
                scheduledWorkMinutes: 0,
                overtimeMinutes: 0,
                latenessMinutes: 0,
                missingWorkMinutes: 0,
                workingDays: 0
            };
        }
    }

    async listPayrollRuns(
        params: { status?: string; period?: string; page?: number; limit?: number },
        userId?: string,
    ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
        // Note: Controller already handles role check via guards, so we skip ensurePayrollSpecialist here

        const page = Math.max(1, params.page || 1);
        const limit = Math.max(1, Math.min(100, params.limit || 10));

        const filter: any = {};
        if (params.status) {
            filter.status = params.status;
        }
        if (params.period) {
            filter.period = params.period;
        }

        const total = await this.payrollRunsModel.countDocuments(filter);
        const items = await this.payrollRunsModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
            .exec();

        return {
            data: items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    // Helper to get unpaid leave days from Leaves module
    private async getUnpaidLeaveDays(employeeId: any, periodStart: Date, periodEnd: Date): Promise<number> {
        try {
            if (!this.leavesService) {
                return 0;
            }

            const db = this.db;
            if (!db) return 0;

            // Query leave requests directly from DB
            const leaveRequests = await db.collection('leaverequests').find({
                employeeId: new mongoose.Types.ObjectId(employeeId),
                status: 'APPROVED',
                'dates.from': { $lte: periodEnd },
                'dates.to': { $gte: periodStart }
            }).toArray();

            let unpaidDays = 0;

            for (const leave of leaveRequests) {
                // Get leave type to check if it's paid or unpaid
                const leaveType = await db.collection('leavetypes').findOne({
                    _id: leave.leaveTypeId
                });

                // If leave type is not paid or explicitly marked as unpaid
                if (leaveType && (!leaveType.paid || leaveType.isPaid === false)) {
                    unpaidDays += leave.durationDays || 0;
                }
            }

            return unpaidDays;
        } catch (err) {
            console.error(`Error getting unpaid leave days for employee ${employeeId}:`, err);
            return 0;
        }
    }

    private async validateEmployeeContract(employeeId: any): Promise<any> {
        const db = this.db;
        if (!db) throw new BadRequestException('Database unavailable');

        const eid = typeof employeeId === 'string' ? new mongoose.Types.ObjectId(employeeId) : employeeId;
        
        // TODO: Integration with Employee module - check if employee exists
        const employee = await db.collection('employee_profiles').findOne({ _id: eid });
        if (!employee) {
            throw new NotFoundException(`Employee ${employeeId} not found`);
        }

        // TODO: Integration with Employee module - validate active contract (BR 1, BR 66)
        // Should check: contract is active, not expired, not suspended
        // For now, we check basic status (case insensitive)
        const activeStatuses = ['ACTIVE', 'Active', 'active'];
        if (!activeStatuses.includes(employee.status)) {
            throw new BadRequestException(`Employee ${employeeId} does not have active status. Current status: ${employee.status}`);
        }

        return employee;
    }

    // Helper to check for duplicate payroll period
    private async validateNoDuplicatePayrollPeriod(payrollPeriod: Date, excludeRunId?: string): Promise<void> {
        const periodStart = new Date(payrollPeriod);
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodStart.getMonth() + 1);
        periodEnd.setDate(0);
        periodEnd.setHours(23, 59, 59, 999);

        const query: any = {
            payrollPeriod: { $gte: periodStart, $lte: periodEnd },
            status: { $nin: [PayRollStatus.REJECTED] } // Allow creating new run if previous was rejected
        };

        if (excludeRunId) {
            query._id = { $ne: new mongoose.Types.ObjectId(excludeRunId) };
        }

        const existing = await this.payrollRunsModel.findOne(query).lean().exec();
        if (existing) {
            throw new ConflictException(`Payroll run already exists for period ${payrollPeriod.toISOString().substring(0, 7)}`);
        }
    }

    // Validate state transitions for signing bonuses
    private validateBonusStateTransition(currentStatus: BonusStatus, newStatus: BonusStatus, operation: string): void {
        const validTransitions: Record<BonusStatus, BonusStatus[]> = {
            [BonusStatus.PENDING]: [BonusStatus.APPROVED, BonusStatus.REJECTED],
            [BonusStatus.APPROVED]: [BonusStatus.PAID],
            [BonusStatus.PAID]: [], // Terminal state
            [BonusStatus.REJECTED]: [] // Terminal state
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid state transition for ${operation}: ${currentStatus} -> ${newStatus}`
            );
        }
    }

    // Validate state transitions for benefits
    private validateBenefitStateTransition(currentStatus: BenefitStatus, newStatus: BenefitStatus, operation: string): void {
        const validTransitions: Record<BenefitStatus, BenefitStatus[]> = {
            [BenefitStatus.PENDING]: [BenefitStatus.APPROVED, BenefitStatus.REJECTED],
            [BenefitStatus.APPROVED]: [BenefitStatus.PAID],
            [BenefitStatus.PAID]: [], // Terminal state
            [BenefitStatus.REJECTED]: [] // Terminal state
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid state transition for ${operation}: ${currentStatus} -> ${newStatus}`
            );
        }
    }

    // Validate state transitions for payroll runs
    private validatePayrollStateTransition(currentStatus: PayRollStatus, newStatus: PayRollStatus, operation: string): void {
        const validTransitions: Record<PayRollStatus, PayRollStatus[]> = {
            [PayRollStatus.DRAFT]: [PayRollStatus.UNDER_REVIEW, PayRollStatus.REJECTED],
            [PayRollStatus.UNDER_REVIEW]: [PayRollStatus.PENDING_FINANCE_APPROVAL, PayRollStatus.REJECTED],
            [PayRollStatus.PENDING_FINANCE_APPROVAL]: [PayRollStatus.APPROVED, PayRollStatus.REJECTED],
            [PayRollStatus.APPROVED]: [PayRollStatus.LOCKED],
            [PayRollStatus.LOCKED]: [PayRollStatus.UNLOCKED],
            [PayRollStatus.UNLOCKED]: [PayRollStatus.LOCKED],
            [PayRollStatus.REJECTED]: [PayRollStatus.DRAFT] // Can re-edit after rejection
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid state transition for ${operation}: ${currentStatus} -> ${newStatus}`
            );
        }
    }

    // ============ SIGNING BONUS METHODS ============
    
    async listSigningBonuses(status?: string) {
        const filter: any = {};
        if (status) filter.status = status;
        
        const bonuses = await this.employeeSigningBonusModel.find(filter).lean().exec();
        
        // Populate employee names from employee_profiles collection
        const db = this.db;
        if (db && bonuses.length > 0) {
            const employeeIds = bonuses.map(b => b.employeeId);
            const employees = await db.collection('employee_profiles').find(
                { _id: { $in: employeeIds } },
                { projection: { _id: 1, firstName: 1, lastName: 1, fullName: 1 } }
            ).toArray();
            
            const employeeMap = new Map(employees.map(e => [
                e._id.toString(), 
                e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown'
            ]));
            
            return bonuses.map(b => ({
                ...b,
                employeeName: employeeMap.get(b.employeeId?.toString()) || 'Unknown'
            }));
        }
        
        return bonuses;
    }

    async getSigningBonus(id: string) {
        const doc = await this.employeeSigningBonusModel.findById(id).lean().exec();
        if (!doc) {
            throw new NotFoundException(`Signing bonus ${id} not found`);
        }
        return doc;
    }

    async updateSigningBonus(id: string, dto: { status?: BonusStatus; paymentDate?: string; amount?: number; note?: string }, updatedBy?: string) {
        await this.ensurePayrollSpecialist(updatedBy);
        
        // Get current bonus
        const existing = await this.employeeSigningBonusModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Signing bonus ${id} not found`);
        }

        // BR 25: Manual overrides require authorization (already ensured via ensurePayrollSpecialist)
        // Validate state: cannot edit PAID or REJECTED bonuses
        if (existing.status === BonusStatus.PAID) {
            throw new BadRequestException('Cannot edit signing bonus that has already been paid');
        }
        if (existing.status === BonusStatus.REJECTED) {
            throw new BadRequestException('Cannot edit rejected signing bonus');
        }

        const update: any = {};
        
        // Validate and set status if provided
        if (dto.status !== undefined) {
            this.validateBonusStateTransition(existing.status, dto.status, 'signing bonus update');
            update.status = dto.status;
        }
        
        // Use givenAmount instead of amount (matching schema)
        if (dto.amount !== undefined) {
            if (dto.amount < 0) {
                throw new BadRequestException('Signing bonus amount cannot be negative');
            }
            update.givenAmount = dto.amount;
        }
        
        if (dto.note !== undefined) {
            update.note = dto.note;
        }
        
        if (dto.paymentDate !== undefined) {
            const d = new Date(dto.paymentDate);
            if (isNaN(d.getTime())) {
                throw new BadRequestException('Invalid paymentDate; expected ISO date string');
            }
            update.paymentDate = d;
        }

        update.updatedAt = new Date();
        
        const doc = await this.employeeSigningBonusModel.findByIdAndUpdate(
            id, 
            { $set: update }, 
            { new: true }
        ).exec();
        
        return doc;
    }

    async approveSigningBonus(id: string, approvedBy?: string) {
        await this.ensurePayrollSpecialist(approvedBy);
        
        const existing = await this.employeeSigningBonusModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Signing bonus ${id} not found`);
        }

        // Validate approver exists and is active
        if (approvedBy) {
            await this.validateApprover(approvedBy);
        }

        // Validate state transition
        this.validateBonusStateTransition(existing.status, BonusStatus.APPROVED, 'signing bonus approval');

        // BR 28: Ensure signing bonus is disbursed only once - check if already approved/paid
        if (existing.status === BonusStatus.APPROVED || existing.status === BonusStatus.PAID) {
            throw new BadRequestException('Signing bonus has already been approved');
        }

        const now = new Date();
        const doc = await this.employeeSigningBonusModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: BonusStatus.APPROVED, 
                    paymentDate: now,
                    updatedAt: now 
                } 
            },
            { new: true },
        ).exec();
        
        return doc;
    }

    async approveSigningBonuses(approvedBy?: string) {
        await this.ensurePayrollSpecialist(approvedBy);
        
        const now = new Date();
        
        // Only approve PENDING bonuses (not REJECTED or already APPROVED/PAID)
        const res = await this.employeeSigningBonusModel.updateMany(
            { status: BonusStatus.PENDING },
            { 
                $set: { 
                    status: BonusStatus.APPROVED, 
                    paymentDate: now,
                    updatedAt: now 
                } 
            },
        ).exec();
        
        return {
            matchedCount: (res as any).matchedCount ?? (res as any).n ?? 0,
            modifiedCount: (res as any).modifiedCount ?? (res as any).nModified ?? 0,
            approvedAt: now,
        };
    }

    // REQ-PY-28: Reject signing bonus
    async rejectSigningBonus(id: string, rejectedBy?: string, reason?: string) {
        await this.ensurePayrollSpecialist(rejectedBy);
        
        const existing = await this.employeeSigningBonusModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Signing bonus ${id} not found`);
        }

        // Can only reject PENDING bonuses
        if (existing.status !== BonusStatus.PENDING) {
            throw new BadRequestException(`Cannot reject signing bonus in status ${existing.status}`);
        }

        if (!reason || reason.trim().length === 0) {
            throw new BadRequestException('Rejection reason is required');
        }

        const now = new Date();
        const doc = await this.employeeSigningBonusModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: BonusStatus.REJECTED, 
                    rejectionReason: reason,
                    updatedAt: now 
                } 
            },
            { new: true },
        ).exec();
        
        return doc;
    }

    // ============ TERMINATION/RESIGNATION BENEFITS METHODS ============
    
    async listTerminationBenefits(status?: string) {
        const filter: any = {};
        if (status) filter.status = status;
        
        const benefits = await this.employeeTerminationResignationModel.find(filter).lean().exec();
        
        // Populate employee names from employee_profiles collection
        const db = this.db;
        if (db && benefits.length > 0) {
            const employeeIds = benefits.map(b => b.employeeId);
            const employees = await db.collection('employee_profiles').find(
                { _id: { $in: employeeIds } },
                { projection: { _id: 1, firstName: 1, lastName: 1, fullName: 1 } }
            ).toArray();
            
            const employeeMap = new Map(employees.map(e => [
                e._id.toString(), 
                e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown'
            ]));
            
            // Also get benefit type names if benefitId is present
            const benefitIds = benefits.filter(b => b.benefitId).map(b => b.benefitId);
            let benefitTypeMap = new Map<string, string>();
            if (benefitIds.length > 0) {
                const benefitTypes = await db.collection('terminationandresignationbenefits').find(
                    { _id: { $in: benefitIds } },
                    { projection: { _id: 1, name: 1, type: 1 } }
                ).toArray();
                benefitTypeMap = new Map(benefitTypes.map(bt => [
                    bt._id.toString(),
                    bt.name || bt.type || 'Termination'
                ]));
            }
            
            return benefits.map(b => ({
                ...b,
                employeeName: employeeMap.get(b.employeeId?.toString()) || 'Unknown',
                benefitType: b.benefitId ? benefitTypeMap.get(b.benefitId.toString()) : 'Termination'
            }));
        }
        
        return benefits;
    }

    async getTerminationBenefit(id: string) {
        const doc = await this.employeeTerminationResignationModel.findById(id).lean().exec();
        if (!doc) {
            throw new NotFoundException(`Termination benefit ${id} not found`);
        }
        return doc;
    }

    async updateTerminationBenefit(id: string, dto: any, updatedBy?: string) {
        await this.ensurePayrollSpecialist(updatedBy);
        
        // Get current benefit
        const existing = await this.employeeTerminationResignationModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Termination benefit ${id} not found`);
        }

        // BR 27: Manual adjustments require approval and logging
        // Validate state: cannot edit PAID or REJECTED benefits
        if (existing.status === BenefitStatus.PAID) {
            throw new BadRequestException('Cannot edit termination benefit that has already been paid');
        }
        if (existing.status === BenefitStatus.REJECTED) {
            throw new BadRequestException('Cannot edit rejected termination benefit');
        }

        const update: any = {};
        
        // Validate and set status if provided
        if (dto.status !== undefined) {
            this.validateBenefitStateTransition(existing.status, dto.status, 'termination benefit update');
            update.status = dto.status;
        }
        
        if (dto.note !== undefined) {
            update.note = dto.note;
        }
        
        // BR 27: givenAmount validation
        if (dto.givenAmount !== undefined) {
            if (dto.givenAmount < 0) {
                throw new BadRequestException('Termination benefit amount cannot be negative');
            }
            if (dto.givenAmount > 5000000) { // Max cap for termination benefits
                throw new BadRequestException('Termination benefit amount exceeds maximum allowed (5,000,000)');
            }
            update.givenAmount = dto.givenAmount;
        }

        update.updatedAt = new Date();
        update.updatedBy = new mongoose.Types.ObjectId(updatedBy);
        
        const doc = await this.employeeTerminationResignationModel.findByIdAndUpdate(
            id, 
            { $set: update }, 
            { new: true }
        ).exec();
        
        return doc;
    }

    async approveTerminationBenefit(id: string, approvedBy?: string) {
        await this.ensurePayrollSpecialist(approvedBy);
        
        const existing = await this.employeeTerminationResignationModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Termination benefit ${id} not found`);
        }

        // Validate approver exists and is active
        if (approvedBy) {
            await this.validateApprover(approvedBy);
        }

        // Validate state transition
        this.validateBenefitStateTransition(existing.status, BenefitStatus.APPROVED, 'termination benefit approval');

        // BR 26: Termination benefits should not be processed until HR clearance completed
        // Note: If terminationId is present, verify the request exists and is approved
        // If not found, we allow approval (for manually created benefits or legacy data)
        const db = this.db;
        if (db && existing.terminationId) {
            const terminationRequest = await db.collection('termination_requests').findOne({ 
                _id: existing.terminationId 
            });
            
            // Only enforce approval check if the termination request exists
            if (terminationRequest) {
                // Check if termination request is in approved state
                if (terminationRequest.status !== 'APPROVED' && terminationRequest.status !== 'approved') {
                    throw new BadRequestException(
                        `Cannot approve benefits until termination request is approved. Current status: ${terminationRequest.status}`
                    );
                }
            }
            // If terminationRequest not found, allow approval (legacy data compatibility)
        }

        const now = new Date();
        const doc = await this.employeeTerminationResignationModel.findByIdAndUpdate(
            id, 
            { 
                $set: { 
                    status: BenefitStatus.APPROVED, 
                    approvedAt: now,
                    updatedAt: now 
                } 
            }, 
            { new: true }
        ).exec();
        
        return doc;
    }

    // REQ-PY-31: Reject termination/resignation benefit
    async rejectTerminationBenefit(id: string, rejectedBy?: string, reason?: string) {
        await this.ensurePayrollSpecialist(rejectedBy);
        
        const existing = await this.employeeTerminationResignationModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Termination benefit ${id} not found`);
        }

        // Can only reject PENDING benefits
        if (existing.status !== BenefitStatus.PENDING) {
            throw new BadRequestException(`Cannot reject termination benefit in status ${existing.status}`);
        }

        if (!reason || reason.trim().length === 0) {
            throw new BadRequestException('Rejection reason is required');
        }

        const now = new Date();
        const doc = await this.employeeTerminationResignationModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: BenefitStatus.REJECTED, 
                    rejectionReason: reason,
                    updatedAt: now 
                } 
            },
            { new: true },
        ).exec();
        
        return doc;
    }

    // ============ PAYROLL INITIATION AND RUN METHODS ============
    
    async getDraft(id: string, requestedBy?: string) {
        // Draft feature deprecated - returns payroll run details instead
        return this.getPayrollInitiation(id);
    }

    async createPayrollInitiation(dto: any, createdBy?: string) {
        await this.ensurePayrollSpecialist(createdBy);
        
        // Validate and parse payroll period
        let payrollPeriod: Date;
        if (dto.payrollPeriod) {
            payrollPeriod = new Date(dto.payrollPeriod);
            if (isNaN(payrollPeriod.getTime())) {
                throw new BadRequestException('Invalid payrollPeriod; expected a valid date');
            }
        } else {
            payrollPeriod = new Date();
        }

        // Validate period is not in the future
        const now = new Date();
        if (payrollPeriod > now) {
            throw new BadRequestException('Cannot create payroll for future period');
        }

        // Check for duplicate payroll period (BR 63)
        await this.validateNoDuplicatePayrollPeriod(payrollPeriod);

        // Generate unique run ID
        const runId = dto.runId || `PR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now()}`;

        const payrollSpecialistId = createdBy ? new mongoose.Types.ObjectId(createdBy) : null;
        const payrollManagerId = dto.payrollManagerId 
            ? new mongoose.Types.ObjectId(dto.payrollManagerId)
            : payrollSpecialistId;

        const doc: any = {
            runId,
            payrollPeriod,
            status: PayRollStatus.DRAFT,
            entity: dto.entity || 'default',
            entityId: dto.entityId ? new mongoose.Types.ObjectId(dto.entityId) : undefined,
            employees: dto.employees ?? 0,
            exceptions: dto.exceptions ?? 0,
            totalnetpay: dto.totalnetpay ?? 0,
            payrollSpecialistId,
            payrollManagerId,
            paymentStatus: PayRollPaymentStatus.PENDING,
        };

        const created = await this.payrollRunsModel.create(doc);
        return created;
    }

    async getPayrollInitiation(id: string) {
        const doc = await this.payrollRunsModel.findById(id).lean().exec();
        if (!doc) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }
        return doc;
    }

    async updatePayrollInitiation(id: string, dto: any, updatedBy?: string) {
        await this.ensurePayrollSpecialist(updatedBy);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Validate can only edit DRAFT or REJECTED runs
        if (existing.status !== PayRollStatus.DRAFT && existing.status !== PayRollStatus.REJECTED) {
            throw new BadRequestException(
                `Cannot edit payroll in status ${existing.status}. Only DRAFT or REJECTED runs can be edited.`
            );
        }

        const update: any = {};
        
        // Validate and update payroll period if provided
        if (dto.payrollPeriod) {
            const newPeriod = new Date(dto.payrollPeriod);
            if (isNaN(newPeriod.getTime())) {
                throw new BadRequestException('Invalid payrollPeriod; expected a valid date');
            }
            
            // Check for duplicate period (excluding current run)
            await this.validateNoDuplicatePayrollPeriod(newPeriod, id);
            update.payrollPeriod = newPeriod;
        }
        
        if (dto.entity) update.entity = dto.entity;
        if (dto.employees !== undefined) update.employees = dto.employees;
        if (dto.exceptions !== undefined) update.exceptions = dto.exceptions;
        if (dto.totalnetpay !== undefined) update.totalnetpay = dto.totalnetpay;
        
        // If previously rejected, reset to draft and clear rejection reason
        if (existing.status === PayRollStatus.REJECTED) {
            update.status = PayRollStatus.DRAFT;
            update.rejectionReason = null;
        }
        
        update.updatedAt = new Date();
        
        const updated = await this.payrollRunsModel.findByIdAndUpdate(
            id, 
            { $set: update }, 
            { new: true }
        ).exec();
        
        return updated;
    }

    async approvePayrollInitiation(id: string, approvedBy?: string) {
        await this.ensurePayrollSpecialist(approvedBy);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Validate state transition
        this.validatePayrollStateTransition(existing.status, PayRollStatus.UNDER_REVIEW, 'payroll initiation approval');

        const now = new Date();
        
        // Update to UNDER_REVIEW and trigger processing
        // Note: managerApprovalDate is NOT set here - it's set when Payroll Manager approves (REQ-PY-22)
        const updated = await this.payrollRunsModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: PayRollStatus.UNDER_REVIEW, 
                    specialistApprovalDate: now, // Track when specialist submitted for review
                    updatedAt: now 
                } 
            },
            { new: true }
        ).exec();

        try {
            // Process the payroll run (REQ-PY-23)
            await this.processPayrollRun(updated);
            
            // After successful processing, stay in UNDER_REVIEW for Manager approval (REQ-PY-20, REQ-PY-22)
            // Manager must approve before it goes to PENDING_FINANCE_APPROVAL
            const finalized = await this.payrollRunsModel.findByIdAndUpdate(
                id,
                { 
                    $set: { 
                        // Status remains UNDER_REVIEW - awaiting Payroll Manager approval
                        status: PayRollStatus.UNDER_REVIEW,
                        updatedAt: new Date() 
                    } 
                },
                { new: true }
            ).exec();
            
            return finalized;
        } catch (err) {
            console.error('Payroll processing failed for run', id, err);
            // Revert to draft on processing failure
            await this.payrollRunsModel.findByIdAndUpdate(
                id,
                { 
                    $set: { 
                        status: PayRollStatus.DRAFT,
                        exceptions: (existing.exceptions || 0) + 1,
                        updatedAt: new Date()
                    } 
                }
            ).exec();
            throw new BadRequestException(`Payroll processing failed: ${err.message}`);
        }
    }

    async rejectPayrollInitiation(id: string, rejectedBy?: string, reason?: string) {
        await this.ensurePayrollSpecialist(rejectedBy);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Can reject from DRAFT or UNDER_REVIEW
        if (existing.status !== PayRollStatus.DRAFT && existing.status !== PayRollStatus.UNDER_REVIEW) {
            throw new BadRequestException(
                `Cannot reject payroll in status ${existing.status}`
            );
        }

        if (!reason || reason.trim().length === 0) {
            throw new BadRequestException('Rejection reason is required');
        }

        const updated = await this.payrollRunsModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: PayRollStatus.REJECTED, 
                    rejectionReason: reason,
                    updatedAt: new Date() 
                } 
            },
            { new: true }
        ).exec();
        
        return updated;
    }

    // REQ-PY-22: Manager approval
    async approvePayroll(id: string, approvedBy?: string) {
        await this.ensurePayrollManager(approvedBy);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Validate approver and prevent self-approval (BR 30: multi-step approval)
        if (approvedBy && existing.payrollSpecialistId) {
            await this.validateApprover(approvedBy, existing.payrollSpecialistId.toString());
        }

        // Can only approve from UNDER_REVIEW (manager approval moves to PENDING_FINANCE_APPROVAL)
        if (existing.status !== PayRollStatus.UNDER_REVIEW) {
            throw new BadRequestException(
                `Cannot approve payroll in status ${existing.status}. Must be in 'under review' status.`
            );
        }

        const now = new Date();
        const managerId = new mongoose.Types.ObjectId(approvedBy);
        
        // REQ-PY-22: Manager approval transitions to PENDING_FINANCE_APPROVAL
        const updated = await this.payrollRunsModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: PayRollStatus.PENDING_FINANCE_APPROVAL,
                    payrollManagerId: managerId,
                    managerApprovalDate: now,
                    updatedAt: now 
                } 
            },
            { new: true }
        ).exec();
        
        return updated;
    }

    // REQ-PY-15: Finance approval - final approval before payment
    async approvePayrollFinance(id: string, approvedBy?: string) {
        await this.ensureFinanceStaff(approvedBy);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Validate approver and prevent self-approval (BR 30: multi-step approval)
        if (approvedBy && existing.payrollSpecialistId) {
            await this.validateApprover(approvedBy, existing.payrollSpecialistId.toString());
            // Also ensure finance approver is not the manager approver
            if (existing.payrollManagerId && existing.payrollManagerId.toString() === approvedBy) {
                throw new ForbiddenException('Finance approver cannot be the same as manager approver');
            }
        }

        // Validate state transition (BR 30: Multi-step approval)
        this.validatePayrollStateTransition(
            existing.status, 
            PayRollStatus.APPROVED, 
            'finance approval'
        );

        // Ensure manager has approved first
        if (!existing.managerApprovalDate) {
            throw new BadRequestException('Payroll must be approved by manager before finance approval');
        }

        const now = new Date();
        const financeId = new mongoose.Types.ObjectId(approvedBy);
        
        // Update status to APPROVED and payment status to PAID (BR 18)
        const updated = await this.payrollRunsModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: PayRollStatus.APPROVED,
                    paymentStatus: PayRollPaymentStatus.PAID,
                    financeStaffId: financeId,
                    financeApprovalDate: now,
                    updatedAt: now 
                } 
            },
            { new: true }
        ).exec();

        // Update all payslips to PAID status (REQ-PY-8)
        await this.paySlipModel.updateMany(
            { payrollRunId: new mongoose.Types.ObjectId(id) },
            { 
                $set: { 
                    paymentStatus: PaySlipPaymentStatus.PAID,
                    updatedAt: now 
                } 
            }
        ).exec();
        
        return updated;
    }

    // REQ-PY-7: Lock/Freeze payroll
    async freezePayroll(id: string, by?: string) {
        await this.ensurePayrollManager(by);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Validate state transition
        this.validatePayrollStateTransition(existing.status, PayRollStatus.LOCKED, 'freeze payroll');

        // Can only freeze APPROVED payrolls
        if (existing.status !== PayRollStatus.APPROVED) {
            throw new BadRequestException('Can only freeze approved payrolls');
        }

        const updated = await this.payrollRunsModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: PayRollStatus.LOCKED,
                    updatedAt: new Date() 
                } 
            },
            { new: true }
        ).exec();
        
        return updated;
    }

    // REQ-PY-19: Unfreeze payroll with reason
    async unfreezePayroll(id: string, by?: string, reason?: string) {
        await this.ensurePayrollManager(by);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Validate state transition
        this.validatePayrollStateTransition(existing.status, PayRollStatus.UNLOCKED, 'unfreeze payroll');

        // Can only unfreeze LOCKED payrolls
        if (existing.status !== PayRollStatus.LOCKED) {
            throw new BadRequestException('Can only unfreeze locked payrolls');
        }

        if (!reason || reason.trim().length === 0) {
            throw new BadRequestException('Reason is required to unfreeze payroll');
        }

        const updated = await this.payrollRunsModel.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    status: PayRollStatus.UNLOCKED,
                    unlockReason: reason,
                    updatedAt: new Date() 
                } 
            },
            { new: true }
        ).exec();
        
        return updated;
    }

    // Diagnostic endpoint to check employee status distribution
    async getEmployeeStatusDiagnostics(requestedBy?: string) {
        const db = this.db;
        if (!db) {
            throw new BadRequestException('Database unavailable');
        }

        // Get all unique statuses and their counts
        const statusAggregation = await db.collection('employee_profiles').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        const totalEmployees = await db.collection('employee_profiles').countDocuments({});
        
        // Check for employees that would be picked up by payroll processing
        const activeEmployees = await db.collection('employee_profiles').countDocuments({
            $or: [
                { status: 'ACTIVE' },
                { status: 'Active' },
                { status: 'active' }
            ]
        });

        // Get sample of employees for debugging
        const sampleEmployees = await db.collection('employee_profiles').find({})
            .project({ _id: 1, firstName: 1, lastName: 1, status: 1, employeeNumber: 1 })
            .limit(10)
            .toArray();

        return {
            totalEmployees,
            activeEmployeesForPayroll: activeEmployees,
            statusBreakdown: statusAggregation.map(s => ({ status: s._id || 'null/undefined', count: s.count })),
            sampleEmployees: sampleEmployees.map(e => ({
                id: e._id,
                name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
                status: e.status,
                employeeNumber: e.employeeNumber
            })),
            note: activeEmployees === 0 
                ? 'WARNING: No employees with ACTIVE status found. Payroll runs will have 0 employees. Please ensure employees have status set to "ACTIVE".'
                : `${activeEmployees} employees will be included in payroll processing.`
        };
    }

    // List all departments for payroll entity dropdown
    async listDepartments(requestedBy?: string) {
        const db = this.db;
        if (!db) {
            throw new BadRequestException('Database unavailable');
        }

        const departments = await db.collection('departments').find({})
            .project({ _id: 1, code: 1, name: 1, description: 1 })
            .sort({ name: 1 })
            .toArray();

        // Get employee count per department
        const deptEmployeeCounts = await db.collection('employee_profiles').aggregate([
            { 
                $match: { 
                    $or: [
                        { status: 'ACTIVE' },
                        { status: 'Active' },
                        { status: 'active' }
                    ]
                }
            },
            { $group: { _id: '$primaryDepartmentId', count: { $sum: 1 } } }
        ]).toArray();

        const countMap = new Map(deptEmployeeCounts.map(d => [d._id?.toString(), d.count]));

        return departments.map(d => ({
            _id: d._id,
            code: d.code,
            name: d.name,
            description: d.description,
            activeEmployeeCount: countMap.get(d._id?.toString()) || 0
        }));
    }

    // REQ-PY-8: List payslips for a payroll run (BR 17: with clear breakdown)
    async listPayslipsByRun(payrollRunId: string, requestedBy?: string) {
        const existing = await this.payrollRunsModel.findById(payrollRunId).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${payrollRunId} not found`);
        }

        const payslips = await this.paySlipModel.find({ 
            payrollRunId: new mongoose.Types.ObjectId(payrollRunId) 
        }).lean().exec();

        // Populate employee names
        const db = this.db;
        if (db && payslips.length > 0) {
            const employeeIds = payslips.map((p: any) => p.employeeId);
            const employees = await db.collection('employee_profiles').find(
                { _id: { $in: employeeIds } },
                { projection: { _id: 1, firstName: 1, lastName: 1, fullName: 1, employeeNumber: 1 } }
            ).toArray();
            
            const employeeMap = new Map<string, { name: string; employeeNumber: string }>(
                employees.map((e: any) => [
                    e._id.toString(), 
                    {
                        name: e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
                        employeeNumber: e.employeeNumber || ''
                    }
                ])
            );
            
            return payslips.map((p: any) => ({
                ...p,
                employeeName: employeeMap.get(p.employeeId?.toString())?.name || 'Unknown',
                employeeNumber: employeeMap.get(p.employeeId?.toString())?.employeeNumber || '',
                payrollPeriod: existing.payrollPeriod,
                entity: existing.entity,
            }));
        }
        
        return payslips.map((p: any) => ({
            ...p,
            payrollPeriod: existing.payrollPeriod,
            entity: existing.entity,
        }));
    }

    // REQ-PY-8: Get single payslip with full breakdown (BR 17)
    async getPayslip(payslipId: string, requestedBy?: string) {
        const payslip: any = await this.paySlipModel.findById(payslipId).lean().exec();
        if (!payslip) {
            throw new NotFoundException(`Payslip ${payslipId} not found`);
        }

        // Get payroll run info
        const payrollRun: any = await this.payrollRunsModel.findById(payslip.payrollRunId).lean().exec();

        // Get employee name
        const db = this.db;
        let employeeName = 'Unknown';
        let employeeNumber = '';
        if (db) {
            const employee: any = await db.collection('employee_profiles').findOne(
                { _id: payslip.employeeId },
                { projection: { firstName: 1, lastName: 1, fullName: 1, employeeNumber: 1 } }
            );
            if (employee) {
                employeeName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown';
                employeeNumber = employee.employeeNumber || '';
            }
        }

        return {
            ...payslip,
            employeeName,
            employeeNumber,
            payrollPeriod: payrollRun?.payrollPeriod,
            entity: payrollRun?.entity,
            runStatus: payrollRun?.status,
        };
    }

    // REQ-PY-8: Generate and distribute payslips
    async generatePayslips(id: string, triggeredBy?: string) {
        await this.ensureFinanceStaff(triggeredBy);
        
        const existing = await this.payrollRunsModel.findById(id).lean().exec();
        if (!existing) {
            throw new NotFoundException(`Payroll run ${id} not found`);
        }

        // Can only generate payslips for APPROVED or LOCKED payrolls
        if (existing.status !== PayRollStatus.APPROVED && existing.status !== PayRollStatus.LOCKED) {
            throw new BadRequestException(
                `Cannot generate payslips for payroll in status ${existing.status}`
            );
        }

        // Payslips are already created during processPayrollRun
        // Mark all payslips as PAID (since we don't have bank integration)
        const now = new Date();
        await this.paySlipModel.updateMany(
            { payrollRunId: new mongoose.Types.ObjectId(id) },
            { 
                $set: { 
                    paymentStatus: PaySlipPaymentStatus.PAID,
                    distributedAt: now,
                    distributedBy: triggeredBy ? new mongoose.Types.ObjectId(triggeredBy) : undefined
                } 
            }
        ).exec();

        // Update payroll run to mark payslips as generated
        await this.payrollRunsModel.findByIdAndUpdate(id, {
            $set: {
                payslipsGenerated: true,
                payslipsGeneratedAt: now,
                payslipsGeneratedBy: triggeredBy ? new mongoose.Types.ObjectId(triggeredBy) : undefined
            }
        }).exec();

        const payslips = await this.paySlipModel.find({ 
            payrollRunId: new mongoose.Types.ObjectId(id) 
        }).lean().exec();

        // TODO: Integration with notification/email service to distribute payslips
        return {
            payrollRunId: id,
            payslipsGenerated: payslips.length,
            status: 'distributed',
            generatedBy: triggeredBy,
            generatedAt: now,
            message: `${payslips.length} payslips have been generated and marked as paid`
        };
    }

    // ============ PAYROLL PROCESSING ENGINE ============
    
    private async processPayrollRun(runDoc: payrollRunsDocument | any) {
        if (!runDoc || !runDoc._id) {
            throw new BadRequestException('Invalid payroll run');
        }
        
        const db = this.db;
        if (!db) {
            throw new BadRequestException('Database unavailable');
        }

        // Calculate period boundaries
        const payrollPeriod = runDoc.payrollPeriod ? new Date(runDoc.payrollPeriod) : new Date();
        const periodStart = new Date(payrollPeriod);
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodStart.getMonth() + 1);
        periodEnd.setDate(0);
        periodEnd.setHours(23, 59, 59, 999);

        const daysInMonth = periodEnd.getDate();

        // Get active employees for the period (BR 64: linked to organization accounts)
        // Filter by entity/department if specified
        let employeesList: any[] = [];
        const statusFilter = {
            $or: [
                { status: 'ACTIVE' },
                { status: 'Active' },
                { status: 'active' }
            ]
        };
        
        // Build query - filter by department if entityId is set
        let employeeQuery: any = { ...statusFilter };
        if (runDoc.entityId) {
            employeeQuery.primaryDepartmentId = new mongoose.Types.ObjectId(runDoc.entityId);
            console.log(`[PayrollRun ${runDoc._id}] Filtering by department ID: ${runDoc.entityId}`);
        } else if (runDoc.entity) {
            // Fallback: try to find department by name and filter
            const dept = await db.collection('departments').findOne({ 
                $or: [
                    { name: runDoc.entity },
                    { name: { $regex: new RegExp(`^${runDoc.entity}$`, 'i') } }
                ]
            });
            if (dept) {
                employeeQuery.primaryDepartmentId = dept._id;
                console.log(`[PayrollRun ${runDoc._id}] Found department by name '${runDoc.entity}': ${dept._id}`);
            } else {
                console.log(`[PayrollRun ${runDoc._id}] No department found for entity '${runDoc.entity}', will process ALL active employees`);
            }
        }
        
        employeesList = await db.collection('employee_profiles').find(employeeQuery).toArray();

        console.log(`[PayrollRun ${runDoc._id}] Found ${employeesList.length} active employees for period ${payrollPeriod}`);
        
        if (employeesList.length === 0) {
            console.warn(`[PayrollRun ${runDoc._id}] No active employees found! Check employee_profiles collection.`);
            // Update run to show 0 employees but don't fail
            await this.payrollRunsModel.findByIdAndUpdate(
                runDoc._id,
                {
                    $set: {
                        employees: 0,
                        exceptions: 0,
                        totalnetpay: 0,
                        updatedAt: new Date()
                    }
                }
            ).exec();
            return true;
        }

        // Get configuration data (BR 31: Payroll Schema)
        const taxRules = await db.collection('taxrules').find({ status: 'approved' }).toArray().catch(() => []);
        const insuranceBrackets = await db.collection('insurancebrackets').find({ status: 'approved' }).toArray().catch(() => []);
        const allowancesConfig = await db.collection('allowances').find({ status: 'approved' }).toArray().catch(() => []);
        
        // BR 4: Get minimum wage setting
        const companySettings = await db.collection('companywidesettings').findOne({}) || {};
        const minimumWage = companySettings.minimumWage || 0;

        let employeesCount = 0;
        let exceptionsCount = 0;

        // Check for duplicate employee payroll details
        const existingDetails = await this.employeePayrollDetailsModel.find({
            payrollRunId: runDoc._id
        }).lean().exec();
        
        if (existingDetails.length > 0) {
            throw new BadRequestException('Payroll details already exist for this run. Cannot reprocess.');
        }

        // Process each employee
        for (const emp of employeesList) {
            try {
                await this.processEmployeePayroll(
                    emp,
                    runDoc,
                    periodStart,
                    periodEnd,
                    daysInMonth,
                    taxRules,
                    insuranceBrackets,
                    allowancesConfig,
                    minimumWage,
                    db
                );
                employeesCount++;
            } catch (err) {
                console.error(`Error processing employee ${emp._id}:`, err);
                exceptionsCount++;
                
                // Create exception record
                await this.employeePayrollDetailsModel.create({
                    employeeId: emp._id,
                    baseSalary: 0,
                    allowances: 0,
                    deductions: 0,
                    netSalary: 0,
                    netPay: 0,
                    bankStatus: BankStatus.MISSING,
                    exceptions: err.message || 'Processing error',
                    payrollRunId: runDoc._id,
                });
            }
        }

        // Calculate aggregated totals from all employee payroll details
        const allDetails = await this.employeePayrollDetailsModel.find({
            payrollRunId: runDoc._id
        }).lean().exec();
        
        // Aggregate all financial totals
        let totalNet = 0;
        let totalGross = 0;
        let totalDeductionsSum = 0;
        let totalTaxSum = 0;
        let totalInsuranceSum = 0;
        let totalAllowancesSum = 0;
        let totalBaseSalarySum = 0;
        let totalPenaltiesSum = 0;
        let totalBonusSum = 0;
        let totalBenefitSum = 0;
        let totalOvertimeSum = 0;
        let totalRefundsSum = 0;
        let irregularitiesCount = 0;
        const allIrregularities: string[] = [];

        for (const detail of allDetails) {
            const baseSal = detail.baseSalary || 0;
            const allow = detail.allowances || 0;
            const deductionsBreakdown = detail.deductionsBreakdown as any;
            const tax = deductionsBreakdown?.tax || 0;
            const insurance = deductionsBreakdown?.insurance || 0;
            const penalties = (detail.penalties as any)?.total || 0;
            const overtime = (detail.overtime as any)?.amount || 0;
            const refunds = detail.refunds || 0;
            const bonus = detail.bonus || 0;
            const benefit = detail.benefit || 0;
            
            totalNet += detail.netPay || 0;
            totalGross += baseSal + allow; // Gross = Base + Allowances
            totalTaxSum += tax;
            totalInsuranceSum += insurance;
            totalDeductionsSum += tax + insurance + penalties; // All deductions
            totalAllowancesSum += allow;
            totalBaseSalarySum += baseSal;
            totalPenaltiesSum += penalties;
            totalOvertimeSum += overtime;
            totalRefundsSum += refunds;
            totalBonusSum += bonus;
            totalBenefitSum += benefit;
            
            // Collect irregularities from each employee
            if (detail.exceptions && typeof detail.exceptions === 'string' && detail.exceptions.trim().length > 0) {
                irregularitiesCount++;
                const empId = detail.employeeId?.toString() || 'Unknown';
                allIrregularities.push(`Employee ${empId}: ${detail.exceptions}`);
            }
        }

        // Update payroll run with final counts and aggregated totals
        await this.payrollRunsModel.findByIdAndUpdate(
            runDoc._id,
            {
                $set: {
                    employees: employeesCount,
                    exceptions: exceptionsCount,
                    totalnetpay: totalNet,
                    totalGrossPay: totalGross,
                    totalDeductions: totalDeductionsSum,
                    totalTaxDeductions: totalTaxSum,
                    totalInsuranceDeductions: totalInsuranceSum,
                    totalPenalties: totalPenaltiesSum,
                    totalAllowances: totalAllowancesSum,
                    totalBaseSalary: totalBaseSalarySum,
                    totalOvertime: totalOvertimeSum,
                    totalRefunds: totalRefundsSum,
                    irregularitiesCount: irregularitiesCount,
                    irregularities: allIrregularities.slice(0, 100), // Limit to 100 entries
                    updatedAt: new Date()
                }
            }
        ).exec();

        return true;
    }

    private async processEmployeePayroll(
        emp: any,
        runDoc: any,
        periodStart: Date,
        periodEnd: Date,
        daysInMonth: number,
        taxRules: any[],
        insuranceBrackets: any[],
        allowancesConfig: any[],
        minimumWage: number,
        db: any
    ) {
        const employeeId = emp._id;

        // BR 1, BR 66: Validate active contract
        await this.validateEmployeeContract(employeeId);

        // Get salary from pay grade (proper integration with Payroll Configuration)
        let baseSalary = 0;
        let grossSalary = 0;
        
        if (emp.payGradeId) {
            const payGrade = await db.collection('paygrades').findOne({ 
                _id: new mongoose.Types.ObjectId(emp.payGradeId),
                status: 'approved'
            });
            if (payGrade) {
                baseSalary = payGrade.baseSalary || 0;
                grossSalary = payGrade.grossSalary || baseSalary;
                console.log(`[Employee ${employeeId}] Using pay grade: ${payGrade.grade}, baseSalary: ${baseSalary}`);
            } else {
                console.warn(`[Employee ${employeeId}] Pay grade ${emp.payGradeId} not found or not approved`);
            }
        }
        
        // Fallback: If no pay grade, check for direct baseSalary on employee or use minimum wage
        if (baseSalary === 0) {
            baseSalary = emp.baseSalary || minimumWage || 6000; // Default minimum salary
            grossSalary = baseSalary;
            console.log(`[Employee ${employeeId}] No pay grade - using fallback salary: ${baseSalary}`);
        }
        
        // Get employee's allowances from configuration
        let totalAllowances = 0;
        
        // Check for employee-specific allowances
        const employeeAllowances = await db.collection('employeeallowances').findOne({
            employeeId: employeeId,
            status: 'approved'
        });
        
        if (employeeAllowances && Array.isArray(employeeAllowances.allowances)) {
            totalAllowances = employeeAllowances.allowances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
        } else if (allowancesConfig.length > 0) {
            // Use default allowances from configuration
            totalAllowances = allowancesConfig.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
        }

        // Check if employee was hired mid-month (REQ-PY-2: prorated salary)
        let daysWorked = daysInMonth;
        let isProratedHire = false;
        
        if (emp.dateOfHire) {
            const hireDate = new Date(emp.dateOfHire);
            if (hireDate >= periodStart && hireDate <= periodEnd) {
                // Mid-month hire - prorate salary
                isProratedHire = true;
                const daysFromHire = Math.ceil((periodEnd.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                daysWorked = Math.min(daysFromHire, daysInMonth);
                
                // Auto-process signing bonus (REQ-PY-27, BR 28)
                await this.autoProcessSigningBonus(emp, db, runDoc);
            }
        }

        // Check for termination/resignation (REQ-PY-2: prorated salary)
        let isProratedTermination = false;
        const terminationCheck = await db.collection('termination_requests').findOne({
            employeeId: employeeId,
            status: 'APPROVED'
        });

        if (terminationCheck && terminationCheck.effectiveDate) {
            const termDate = new Date(terminationCheck.effectiveDate);
            if (termDate >= periodStart && termDate <= periodEnd) {
                // Mid-month termination - prorate salary
                isProratedTermination = true;
                const daysUntilTerm = Math.ceil((termDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                daysWorked = Math.min(daysUntilTerm, daysWorked);
                
                // Auto-process termination benefits (REQ-PY-30, BR 29, BR 56)
                await this.autoProcessTerminationBenefits(emp, terminationCheck, db, runDoc);
            }
        }

        // Integration with Time Management module - get actual attendance data
        const attendanceData = await this.getAttendanceData(employeeId, periodStart, periodEnd);
        
        // Integration with Leaves module - get unpaid leave days (BR 11)
        const unpaidLeaveDays = await this.getUnpaidLeaveDays(employeeId, periodStart, periodEnd);

        // Adjust days worked for unpaid leave
        daysWorked = Math.max(0, daysWorked - unpaidLeaveDays);

        // Calculate penalties using SharedPayrollService (Time Management integration)
        let missingHoursPenalty = 0;
        let latenessPenalty = 0;
        let overtimePay = 0;
        let missingWorkReason = '';
        let latenessReason = '';
        let overtimeReason = '';
        
        if (this.sharedPayrollService) {
            // Use SharedPayrollService for Time Management integration
            const timePenalties = await this.sharedPayrollService.calculateTimeBasedPenalties(
                employeeId,
                baseSalary,
                attendanceData,
                daysInMonth,
            );
            missingHoursPenalty = timePenalties.missingWorkPenalty;
            missingWorkReason = timePenalties.missingWorkReason;
            latenessPenalty = timePenalties.latenessPenalty;
            latenessReason = timePenalties.latenessReason;
            
            const overtimeCalc = await this.sharedPayrollService.calculateOvertimePay(
                employeeId,
                baseSalary,
                attendanceData.overtimeMinutes,
                daysInMonth,
            );
            overtimePay = overtimeCalc.overtimePay;
            overtimeReason = overtimeCalc.overtimeReason;
        } else {
            // Fallback: calculate locally
            const hourlyRate = baseSalary / (daysInMonth * 8); // Assuming 8 hours per day
            missingHoursPenalty = (attendanceData.missingWorkMinutes / 60) * hourlyRate;
            missingWorkReason = attendanceData.missingWorkMinutes > 0 
                ? `Missing ${Math.round(attendanceData.missingWorkMinutes)} minutes @ hourly rate`
                : '';
            
            latenessPenalty = (attendanceData.latenessMinutes / 60) * hourlyRate * 0.5; // 50% deduction for lateness
            latenessReason = attendanceData.latenessMinutes > 0
                ? `${Math.round(attendanceData.latenessMinutes)} late minutes @ 50% rate`
                : '';
            
            overtimePay = (attendanceData.overtimeMinutes / 60) * hourlyRate * 1.5;
            overtimeReason = attendanceData.overtimeMinutes > 0
                ? `${(attendanceData.overtimeMinutes / 60).toFixed(2)} hours @ 150% rate`
                : '';
        }

        // Calculate gross salary based on ACTUAL TIME WORKED from Time Management
        // This ensures employees are paid for the time they actually worked, not full base salary
        grossSalary = baseSalary + totalAllowances;
        
        // Calculate the ratio of actual work vs scheduled work from Time Management
        let workRatio = 1; // Default to full pay if no attendance data
        let actualGross = grossSalary;
        let proratedGross = grossSalary;
        
        if (attendanceData.scheduledWorkMinutes > 0) {
            // Pay based on actual hours worked (from Time Management)
            workRatio = attendanceData.actualWorkMinutes / attendanceData.scheduledWorkMinutes;
            workRatio = Math.min(workRatio, 1); // Cap at 100% (overtime is paid separately)
            
            // Calculate gross based on actual work ratio
            actualGross = grossSalary * workRatio;
            
            // Also factor in days worked (for mid-month hires/terminations and unpaid leave)
            const daysRatio = daysWorked / daysInMonth;
            proratedGross = grossSalary * Math.min(workRatio, daysRatio);
            
            console.log(`[Employee ${employeeId}] Time-based pay: actualMinutes=${attendanceData.actualWorkMinutes}, scheduledMinutes=${attendanceData.scheduledWorkMinutes}, workRatio=${(workRatio * 100).toFixed(1)}%, proratedGross=${proratedGross.toFixed(2)}`);
        } else {
            // Fallback: use day-based proration if no Time Management data
            proratedGross = (grossSalary / daysInMonth) * daysWorked;
            console.log(`[Employee ${employeeId}] Day-based pay (no TM data): daysWorked=${daysWorked}/${daysInMonth}, proratedGross=${proratedGross.toFixed(2)}`);
        }

        // BR 34: Apply deductions after gross calculation
        // Calculate tax (BR 3, BR 5, BR 20)
        // Find appropriate tax bracket based on salary (not sum all brackets)
        let taxAmount = 0;
        const applicableTaxRule = taxRules.find((rule: any) => {
            // Match based on salary range in name (e.g., "Standard Tax - 0-50K")
            const name = rule.name || '';
            if (name.includes('0-50K') && baseSalary <= 50000) return true;
            if (name.includes('50K-100K') && baseSalary > 50000 && baseSalary <= 100000) return true;
            if (name.includes('100K-150K') && baseSalary > 100000 && baseSalary <= 150000) return true;
            if (name.includes('150K-200K') && baseSalary > 150000 && baseSalary <= 200000) return true;
            if (name.includes('200K+') && baseSalary > 200000) return true;
            return false;
        }) || taxRules[0]; // Default to first rule if no match
        
        if (applicableTaxRule && applicableTaxRule.rate && typeof applicableTaxRule.rate === 'number') {
            taxAmount = (baseSalary * applicableTaxRule.rate) / 100;
            console.log(`[Employee ${employeeId}] Tax: ${applicableTaxRule.name}, rate: ${applicableTaxRule.rate}%, amount: ${taxAmount}`);
        }

        // BR 7, BR 8: Calculate insurance
        let insuranceAmount = 0;
        const matchingBracket = insuranceBrackets.find((b: any) => 
            baseSalary >= (b.minSalary || 0) && baseSalary <= (b.maxSalary || Number.MAX_SAFE_INTEGER)
        );
        
        if (matchingBracket && matchingBracket.employeeRate) {
            insuranceAmount = (proratedGross * matchingBracket.employeeRate) / 100;
        }

        // BR 33: Get penalties for misconduct from Payroll Tracking
        let misconductPenaltiesAmount = 0;
        const misconductPenalties = await db.collection('employeepenalties').findOne({
            employeeId: employeeId
        });
        
        if (misconductPenalties && Array.isArray(misconductPenalties.penalties)) {
            misconductPenaltiesAmount = misconductPenalties.penalties.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        }

        // Calculate total penalties: misconduct + missing work + lateness
        const totalPenalties = misconductPenaltiesAmount + missingHoursPenalty + latenessPenalty;

        // Integration with Payroll Tracking - get refunds
        let refundsAmount = 0;
        const refunds = await db.collection('employeerefunds').findOne({
            employeeId: employeeId,
            status: 'APPROVED',
            payrollPeriod: { $gte: periodStart, $lte: periodEnd }
        });
        
        if (refunds && Array.isArray(refunds.refunds)) {
            refundsAmount = refunds.refunds.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        }

        // Get signing bonus if approved
        let signingBonusAmount = 0;
        const approvedBonus = await this.employeeSigningBonusModel.findOne({
            employeeId: employeeId,
            status: BonusStatus.APPROVED
        }).lean().exec();
        
        if (approvedBonus) {
            signingBonusAmount = approvedBonus.givenAmount || 0;
            // Mark as paid
            await this.employeeSigningBonusModel.findByIdAndUpdate(
                approvedBonus._id,
                { 
                    $set: { 
                        status: BonusStatus.PAID,
                        paymentDate: new Date(),
                        updatedAt: new Date() 
                    } 
                }
            ).exec();
        }

        // Get termination benefit if approved
        let terminationBenefitAmount = 0;
        const approvedBenefit = await this.employeeTerminationResignationModel.findOne({
            employeeId: employeeId,
            status: BenefitStatus.APPROVED
        }).lean().exec();
        
        if (approvedBenefit) {
            terminationBenefitAmount = approvedBenefit.givenAmount || 0;
            // Mark as paid
            await this.employeeTerminationResignationModel.findByIdAndUpdate(
                approvedBenefit._id,
                { 
                    $set: { 
                        status: BenefitStatus.PAID,
                        updatedAt: new Date() 
                    } 
                }
            ).exec();
        }

        // BR 35: Calculate net salary and net pay
        // SALARY CALCULATION FORMULA:
        // 1. Gross = (Base Salary + Allowances) × (Actual Work Minutes / Scheduled Work Minutes)
        //    - Employees are paid for the TIME THEY ACTUALLY WORKED (from Time Management)
        //    - If no Time Management data, falls back to day-based proration
        // 2. Tax + Insurance are calculated on the prorated gross
        // 3. netSalary = proratedGross - (Tax + Insurance)
        // 4. netPay = netSalary - Penalties (missing work + lateness + misconduct) + Overtime + Refunds + Bonuses + Benefits
        const totalDeductions = taxAmount + insuranceAmount;
        const netSalary = proratedGross - totalDeductions;
        let netPay = netSalary - totalPenalties + overtimePay + refundsAmount + signingBonusAmount + terminationBenefitAmount;
        
        // Total all deductions for reporting (tax + insurance + penalties)
        const totalAllDeductions = totalDeductions + totalPenalties;

        // BR 60: Ensure net pay doesn't go below minimum wage (after penalties)
        const proratedMinimumWage = (minimumWage / daysInMonth) * daysWorked;
        
        // BR 64: Validate bank account exists (check early for both minimum wage and regular processing)
        const bankStatusForMinWage = (!emp.bankAccountNumber || emp.bankAccountNumber.trim() === '') 
            ? BankStatus.MISSING 
            : BankStatus.VALID;
        
        if (netPay < proratedMinimumWage && minimumWage > 0) {
            // Flag as exception but don't fail
            const minWageExceptions = [`Net pay below minimum wage. Adjusted from ${netPay.toFixed(2)} to ${proratedMinimumWage.toFixed(2)}`];
            if (bankStatusForMinWage === BankStatus.MISSING) {
                minWageExceptions.push('Missing bank account');
            }
            
            // Build tax and insurance reason strings
            const taxReason = applicableTaxRule 
                ? `${applicableTaxRule.name}: ${applicableTaxRule.rate}% of ${baseSalary}`
                : 'No applicable tax rule';
            const insuranceReason = matchingBracket 
                ? `Insurance: ${matchingBracket.employeeRate}% of ${proratedGross.toFixed(2)}`
                : 'No applicable insurance bracket';
            const unpaidLeaveReason = unpaidLeaveDays > 0 
                ? `${unpaidLeaveDays} unpaid leave day(s) deducted`
                : '';
            
            await this.employeePayrollDetailsModel.create({
                employeeId: employeeId,
                baseSalary: baseSalary,
                allowances: totalAllowances,
                deductions: totalDeductions,
                deductionsBreakdown: {
                    tax: taxAmount,
                    taxReason: taxReason,
                    insurance: insuranceAmount,
                    insuranceReason: insuranceReason,
                    penalties: totalPenalties,
                    unpaidLeave: 0, // Already factored into prorated salary
                    unpaidLeaveReason: unpaidLeaveReason,
                    total: totalAllDeductions
                },
                penalties: {
                    misconduct: misconductPenaltiesAmount,
                    misconductReason: misconductPenaltiesAmount > 0 ? 'From Payroll Tracking - Employee Penalties' : '',
                    missingWork: missingHoursPenalty,
                    missingWorkReason: missingWorkReason,
                    lateness: latenessPenalty,
                    latenessReason: latenessReason,
                    total: totalPenalties
                },
                overtime: {
                    minutes: attendanceData.overtimeMinutes,
                    amount: overtimePay,
                    reason: overtimeReason
                },
                refunds: refundsAmount,
                attendance: {
                    actualWorkMinutes: attendanceData.actualWorkMinutes,
                    scheduledWorkMinutes: attendanceData.scheduledWorkMinutes,
                    missingWorkMinutes: attendanceData.missingWorkMinutes,
                    overtimeMinutes: attendanceData.overtimeMinutes,
                    latenessMinutes: attendanceData.latenessMinutes,
                    workingDays: attendanceData.workingDays,
                    unpaidLeaveDays: unpaidLeaveDays
                },
                netSalary: netSalary,
                netPay: proratedMinimumWage, // Enforce minimum wage
                bankStatus: bankStatusForMinWage,
                exceptions: minWageExceptions.join('; '),
                bonus: signingBonusAmount,
                benefit: terminationBenefitAmount,
                payrollRunId: runDoc._id,
            });
            return;
        }

        // REQ-PY-5: Flag irregularities
        const irregularities: string[] = [];

        // BR 5: Flag if net pay is negative
        if (netPay < 0) {
            irregularities.push(`Negative net pay: ${netPay.toFixed(2)}`);
            netPay = 0; // Set to zero, don't pay negative
        }

        // BR 64: Validate bank account exists
        let bankStatus = BankStatus.VALID;
        if (!emp.bankAccountNumber || emp.bankAccountNumber.trim() === '') {
            bankStatus = BankStatus.MISSING;
            irregularities.push('Missing bank account');
        }

        // REQ-PY-5: Detect sudden salary spike (>25% increase from previous payroll)
        const previousPayrollDetail = await db.collection('employeepayrolldetails').findOne(
            { 
                employeeId: employeeId,
                payrollRunId: { $ne: runDoc._id }
            },
            { sort: { createdAt: -1 } }
        );
        
        if (previousPayrollDetail && previousPayrollDetail.baseSalary > 0) {
            const salaryChange = ((baseSalary - previousPayrollDetail.baseSalary) / previousPayrollDetail.baseSalary) * 100;
            if (salaryChange > 25) {
                irregularities.push(`Sudden salary spike: ${salaryChange.toFixed(1)}% increase (${previousPayrollDetail.baseSalary} → ${baseSalary})`);
            }
        }

        // Combine irregularities into exception message
        const exceptionMessage = irregularities.length > 0 ? irregularities.join('; ') : null;

        // Build tax and insurance reason strings for the normal case
        const taxReasonNormal = applicableTaxRule 
            ? `${applicableTaxRule.name}: ${applicableTaxRule.rate}% of ${baseSalary}`
            : 'No applicable tax rule';
        const insuranceReasonNormal = matchingBracket 
            ? `Insurance: ${matchingBracket.employeeRate}% of ${proratedGross.toFixed(2)}`
            : 'No applicable insurance bracket';
        const unpaidLeaveReasonNormal = unpaidLeaveDays > 0 
            ? `${unpaidLeaveDays} unpaid leave day(s) deducted`
            : '';

        // Create payroll detail record (BR 36: Store all calculation elements)
        await this.employeePayrollDetailsModel.create({
            employeeId: employeeId,
            baseSalary: baseSalary,
            allowances: totalAllowances,
            deductions: totalDeductions,
            deductionsBreakdown: {
                tax: taxAmount,
                taxReason: taxReasonNormal,
                insurance: insuranceAmount,
                insuranceReason: insuranceReasonNormal,
                penalties: totalPenalties,
                unpaidLeave: 0, // Already factored into prorated salary
                unpaidLeaveReason: unpaidLeaveReasonNormal,
                total: totalAllDeductions
            },
            penalties: {
                misconduct: misconductPenaltiesAmount,
                misconductReason: misconductPenaltiesAmount > 0 ? 'From Payroll Tracking - Employee Penalties' : '',
                missingWork: missingHoursPenalty,
                missingWorkReason: missingWorkReason,
                lateness: latenessPenalty,
                latenessReason: latenessReason,
                total: totalPenalties
            },
            overtime: {
                minutes: attendanceData.overtimeMinutes,
                amount: overtimePay,
                reason: overtimeReason
            },
            refunds: refundsAmount,
            attendance: {
                actualWorkMinutes: attendanceData.actualWorkMinutes,
                scheduledWorkMinutes: attendanceData.scheduledWorkMinutes,
                missingWorkMinutes: attendanceData.missingWorkMinutes,
                overtimeMinutes: attendanceData.overtimeMinutes,
                latenessMinutes: attendanceData.latenessMinutes,
                workingDays: attendanceData.workingDays,
                unpaidLeaveDays: unpaidLeaveDays
            },
            netSalary: netSalary,
            netPay: netPay,
            bankStatus: bankStatus,
            exceptions: exceptionMessage,
            bonus: signingBonusAmount,
            benefit: terminationBenefitAmount,
            payrollRunId: runDoc._id,
        });

        // Build penalties array for payslip (matching employeePenalties schema) with detailed reasons
        const penaltiesList: { reason: string; amount: number }[] = [];
        if (misconductPenaltiesAmount > 0) {
            penaltiesList.push({ reason: 'Misconduct penalties (from Payroll Tracking)', amount: misconductPenaltiesAmount });
        }
        if (missingHoursPenalty > 0) {
            penaltiesList.push({ reason: missingWorkReason || `Missing work: ${Math.round(attendanceData.missingWorkMinutes)} minutes`, amount: missingHoursPenalty });
        }
        if (latenessPenalty > 0) {
            penaltiesList.push({ reason: latenessReason || `Lateness: ${Math.round(attendanceData.latenessMinutes)} minutes`, amount: latenessPenalty });
        }

        // BR 17: Create payslip with detailed breakdown
        await this.paySlipModel.create({
            employeeId: employeeId,
            payrollRunId: runDoc._id,
            earningsDetails: {
                baseSalary: baseSalary,
                allowances: allowancesConfig,
                bonuses: approvedBonus ? [approvedBonus] : [],
                benefits: approvedBenefit ? [approvedBenefit] : [],
                refunds: refundsAmount > 0 ? [{ amount: refundsAmount, description: 'Approved refunds' }] : [],
            },
            deductionsDetails: {
                taxes: taxRules,
                insurances: matchingBracket ? [matchingBracket] : [],
                penalties: penaltiesList.length > 0 ? {
                    employeeId: employeeId,
                    penalties: penaltiesList
                } : undefined,
                // Calculated amounts for easy display
                taxAmount: taxAmount,
                insuranceAmount: insuranceAmount,
                penaltiesAmount: totalPenalties,
            },
            totalGrossSalary: proratedGross,
            totaDeductions: totalAllDeductions, // Total: tax + insurance + penalties
            netPay: netPay,
            paymentStatus: PaySlipPaymentStatus.PENDING,
        });
    }

    private async autoProcessSigningBonus(emp: any, db: any, runDoc: any) {
        // BR 24, BR 28: Auto-create signing bonus for new hires from offer
        try {
            const candidate = await db.collection('candidates').findOne({ 
                personalEmail: emp.personalEmail 
            });
            
            if (!candidate) return;

            const offer = await db.collection('offers').findOne({ 
                candidateId: candidate._id,
                signingBonus: { $exists: true, $gt: 0 }
            });
            
            if (!offer || !offer.signingBonus || offer.signingBonus <= 0) return;

            // Check if signing bonus already exists for this employee
            const existingBonus = await this.employeeSigningBonusModel.findOne({
                employeeId: emp._id
            }).lean().exec();

            if (existingBonus) {
                // BR 28: Signing bonus disbursed only once
                return;
            }

            // Find or create signing bonus configuration
            let sbConfig = await db.collection('signingbonuses').findOne({
                positionName: offer.role || 'Unknown',
                amount: offer.signingBonus
            });

            if (!sbConfig) {
                const insertRes = await db.collection('signingbonuses').insertOne({
                    positionName: offer.role || 'Unknown',
                    amount: offer.signingBonus,
                    status: 'approved',
                    createdBy: runDoc.payrollSpecialistId,
                    approvedBy: runDoc.payrollManagerId,
                    approvedAt: new Date()
                });
                sbConfig = await db.collection('signingbonuses').findOne({ _id: insertRes.insertedId });
            }

            if (sbConfig) {
                // Create employee signing bonus record
                await this.employeeSigningBonusModel.create({
                    employeeId: emp._id,
                    signingBonusId: sbConfig._id,
                    givenAmount: offer.signingBonus,
                    status: BonusStatus.PENDING,
                });
            }
        } catch (err) {
            console.error('Error auto-processing signing bonus:', err);
            // Don't fail the whole payroll for this
        }
    }

    private async autoProcessTerminationBenefits(emp: any, terminationRequest: any, db: any, runDoc: any) {
        // BR 29, BR 56: Auto-calculate termination/resignation benefits
        try {
            // Check if benefit already exists
            const existingBenefit = await this.employeeTerminationResignationModel.findOne({
                employeeId: emp._id,
                terminationId: terminationRequest._id
            }).lean().exec();

            if (existingBenefit) return; // Already processed

            // TODO: Calculate benefits based on contract terms and labor law
            // For now, find configured benefit
            const benefitConfig = await db.collection('terminationandresignationbenefits').findOne({
                status: 'approved'
            });

            if (!benefitConfig) return;

            // Create employee termination benefit record
            await this.employeeTerminationResignationModel.create({
                employeeId: emp._id,
                benefitId: benefitConfig._id,
                terminationId: terminationRequest._id,
                givenAmount: benefitConfig.amount || 0,
                status: BenefitStatus.PENDING,
            });
        } catch (err) {
            console.error('Error auto-processing termination benefits:', err);
            // Don't fail the whole payroll for this
        }
    }
}
