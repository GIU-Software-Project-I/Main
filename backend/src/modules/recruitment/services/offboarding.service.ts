import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { TerminationRequest, TerminationRequestDocument } from '../models/termination-request.schema';
import { ClearanceChecklist, ClearanceChecklistDocument } from '../models/clearance-checklist.schema';
import { Contract, ContractDocument } from '../models/contract.schema';

// Payroll Models
import { EmployeeTerminationResignation, EmployeeTerminationResignationDocument } from '../../payroll/payroll-execution/models/EmployeeTerminationResignation.schema';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsDocument } from '../../payroll/payroll-configuration/models/terminationAndResignationBenefits';
import { BenefitStatus } from '../../payroll/payroll-execution/enums/payroll-execution-enum';

// Payroll Service
import { PayrollExecutionService } from '../../payroll/payroll-execution/services/payroll-execution.service';

// Leaves Models
import { LeaveEntitlement, LeaveEntitlementDocument } from '../../leaves/models/leave-entitlement.schema';
import { LeaveRequest, LeaveRequestDocument } from '../../leaves/models/leave-request.schema';
import { LeaveType, LeaveTypeDocument } from '../../leaves/models/leave-type.schema';
import { LeaveStatus } from '../../leaves/enums/leave-status.enum';

// Employee Models
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee/models/employee/employee-system-role.schema';
import { payGrade, payGradeDocument } from '../../payroll/payroll-configuration/models/payGrades.schema';
import { EmployeeStatus } from '../../employee/enums/employee-profile.enums';

// DTOs
import {
    CreateTerminationRequestDto,
    CreateResignationRequestDto,
    UpdateTerminationStatusDto,
    CreateClearanceChecklistDto,
    UpdateClearanceItemDto,
    UpdateEquipmentItemDto,
    RevokeAccessDto,
    TriggerFinalSettlementDto,
} from '../dto/offboarding';

// Enums
import { TerminationInitiation } from '../enums/termination-initiation.enum';
import { TerminationStatus } from '../enums/termination-status.enum';
import { ApprovalStatus } from '../enums/approval-status.enum';

// Shared Services
import { SharedRecruitmentService } from '../../shared/services/shared-recruitment.service';

@Injectable()
export class OffboardingService {
    private readonly logger = new Logger(OffboardingService.name);

    constructor(
        @InjectModel(TerminationRequest.name) private terminationRequestModel: Model<TerminationRequestDocument>,
        @InjectModel(ClearanceChecklist.name) private clearanceChecklistModel: Model<ClearanceChecklistDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        // Payroll Models
        @InjectModel(EmployeeTerminationResignation.name) private employeeTerminationResignationModel: Model<EmployeeTerminationResignationDocument>,
        @InjectModel(terminationAndResignationBenefits.name) private terminationBenefitsModel: Model<terminationAndResignationBenefitsDocument>,
        // Leaves Models
        @InjectModel(LeaveEntitlement.name) private leaveEntitlementModel: Model<LeaveEntitlementDocument>,
        @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequestDocument>,
        @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveTypeDocument>,
        // Employee Models
        @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(EmployeeSystemRole.name) private employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
        @InjectModel(payGrade.name) private payGradeModel: Model<payGradeDocument>,
        // Services
        @Inject(forwardRef(() => PayrollExecutionService)) private readonly payrollExecutionService: PayrollExecutionService,
        private readonly sharedRecruitmentService: SharedRecruitmentService,
    ) {}


    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    private readonly validStatusTransitions: Record<TerminationStatus, TerminationStatus[]> = {
        [TerminationStatus.PENDING]: [TerminationStatus.UNDER_REVIEW, TerminationStatus.REJECTED],
        [TerminationStatus.UNDER_REVIEW]: [TerminationStatus.APPROVED, TerminationStatus.REJECTED],
        [TerminationStatus.APPROVED]: [],
        [TerminationStatus.REJECTED]: [],
    };

    async createTerminationRequest(dto: CreateTerminationRequestDto): Promise<TerminationRequest & { performanceWarnings?: string[] }> {
        this.validateObjectId(dto.employeeId, 'employeeId');
        this.validateObjectId(dto.contractId, 'contractId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);

        if (employee.status === 'TERMINATED') {
            throw new BadRequestException('Cannot create termination request for already terminated employee');
        }

        const justification = await this.sharedRecruitmentService.validateTerminationJustification(
            dto.employeeId,
            dto.initiator
        );

        const contract = await this.contractModel.findById(dto.contractId).exec();
        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        const existingActiveRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: { $in: [TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW] }
        }).exec();

        if (existingActiveRequest) {
            throw new ConflictException('An active termination request already exists for this employee');
        }

        const existingApprovedRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: TerminationStatus.APPROVED
        }).exec();

        if (existingApprovedRequest) {
            throw new ConflictException('Employee already has an approved termination request');
        }

        if (dto.terminationDate) {
            const terminationDate = new Date(dto.terminationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (terminationDate < today) {
                throw new BadRequestException('Termination date cannot be in the past');
            }
        }

        const terminationRequest = new this.terminationRequestModel({
            employeeId: new Types.ObjectId(dto.employeeId),
            initiator: dto.initiator,
            reason: dto.reason,
            employeeComments: dto.employeeComments,
            hrComments: dto.hrComments,
            status: TerminationStatus.PENDING,
            terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
            contractId: new Types.ObjectId(dto.contractId),
        });

        const savedRequest = await terminationRequest.save();

        const result: any = savedRequest.toObject();
        if (justification.warnings.length > 0) {
            result.performanceWarnings = justification.warnings;
            result.performanceData = {
                hasPublishedAppraisals: justification.performanceData.hasPublishedAppraisals,
                totalAppraisals: justification.performanceData.totalAppraisals,
                averageScore: justification.performanceData.averageScore,
                lowScoreCount: justification.performanceData.lowScoreAppraisals.length,
            };
        }

        return result;
    }

    async getAllTerminationRequests(
        employeeId?: string,
        status?: TerminationStatus,
        initiator?: TerminationInitiation
    ): Promise<TerminationRequest[]> {
        const filter: any = {};

        if (employeeId) {
            filter.employeeId = new Types.ObjectId(employeeId);
        }

        if (status) {
            filter.status = status;
        }

        if (initiator) {
            filter.initiator = initiator;
        }

        return this.terminationRequestModel
            .find(filter)
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getTerminationRequestsByInitiator(
        initiator: TerminationInitiation,
        status?: TerminationStatus
    ): Promise<TerminationRequest[]> {
        const filter: any = { initiator };

        if (status) {
            filter.status = status;
        }

        return this.terminationRequestModel
            .find(filter)
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getAllResignationRequests(status?: TerminationStatus): Promise<TerminationRequest[]> {
        return this.getTerminationRequestsByInitiator(TerminationInitiation.EMPLOYEE, status);
    }

    async getTerminationRequestsByStatus(status: TerminationStatus): Promise<TerminationRequest[]> {
        return this.terminationRequestModel
            .find({ status })
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getTerminationRequestById(id: string): Promise<TerminationRequest> {
        const request = await this.terminationRequestModel
            .findById(id)
            .populate('contractId')
            .exec();

        if (!request) {
            throw new NotFoundException(`Termination request with ID ${id} not found`);
        }

        return request;
    }

    async updateTerminationStatus(id: string, dto: UpdateTerminationStatusDto): Promise<TerminationRequest> {
        this.validateObjectId(id, 'id');

        const request = await this.terminationRequestModel.findById(id).exec();

        if (!request) {
            throw new NotFoundException(`Termination request with ID ${id} not found`);
        }

        const currentStatus = request.status;
        const newStatus = dto.status;
        const allowedTransitions = this.validStatusTransitions[currentStatus];

        if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                `Allowed transitions: ${allowedTransitions?.join(', ') || 'none (status is final)'}`
            );
        }

        request.status = dto.status;

        if (dto.hrComments) {
            request.hrComments = dto.hrComments;
        }

        const savedRequest = await request.save();

        if (dto.status === TerminationStatus.APPROVED) {
            const employee = await this.sharedRecruitmentService.validateEmployeeExists(request.employeeId.toString());
            await this.sharedRecruitmentService.notifyTerminationApproved({
                employeeId: request.employeeId.toString(),
                employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
                terminationDate: request.terminationDate,
                initiator: request.initiator,
            });
        }

        return savedRequest;
    }

    async createResignationRequest(dto: CreateResignationRequestDto): Promise<TerminationRequest> {
        this.validateObjectId(dto.employeeId, 'employeeId');
        this.validateObjectId(dto.contractId, 'contractId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);

        if (employee.status === 'TERMINATED') {
            throw new BadRequestException('Cannot create resignation request for already terminated employee');
        }

        const contract = await this.contractModel.findById(dto.contractId).exec();
        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        const existingActiveRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: { $in: [TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW] }
        }).exec();

        if (existingActiveRequest) {
            throw new ConflictException('An active resignation/termination request already exists');
        }

        const existingApprovedRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: TerminationStatus.APPROVED
        }).exec();

        if (existingApprovedRequest) {
            throw new ConflictException('Employee already has an approved termination/resignation request');
        }

        if (dto.terminationDate) {
            const terminationDate = new Date(dto.terminationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (terminationDate < today) {
                throw new BadRequestException('Termination date cannot be in the past');
            }
        }

        const resignationRequest = new this.terminationRequestModel({
            employeeId: new Types.ObjectId(dto.employeeId),
            initiator: TerminationInitiation.EMPLOYEE,
            reason: dto.reason,
            employeeComments: dto.employeeComments,
            status: TerminationStatus.PENDING,
            terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
            contractId: new Types.ObjectId(dto.contractId),
        });

        return resignationRequest.save();
    }

    async getResignationRequestByEmployeeId(employeeId: string): Promise<TerminationRequest[]> {
        this.validateObjectId(employeeId, 'employeeId');

        return this.terminationRequestModel.find({employeeId: new Types.ObjectId(employeeId), initiator: TerminationInitiation.EMPLOYEE}).sort({ createdAt: -1 }).exec();
    }

    async createClearanceChecklist(dto: CreateClearanceChecklistDto): Promise<ClearanceChecklist> {
        this.validateObjectId(dto.terminationId, 'terminationId');

        const termination = await this.terminationRequestModel.findById(dto.terminationId).exec();
        if (!termination) {
            throw new NotFoundException(`Termination request with ID ${dto.terminationId} not found`);
        }

        if (termination.status !== TerminationStatus.APPROVED) {
            throw new BadRequestException('Clearance checklist can only be created for approved termination requests');
        }

        const existingChecklist = await this.clearanceChecklistModel
            .findOne({ terminationId: new Types.ObjectId(dto.terminationId) })
            .exec();

        if (existingChecklist) {
            throw new ConflictException('Clearance checklist already exists for this termination request');
        }

        const defaultDepartments = ['IT', 'Finance', 'Facilities', 'HR', 'Admin'];
        const items = dto.items && dto.items.length > 0
            ? dto.items.map(item => ({
                department: item.department,
                status: ApprovalStatus.PENDING,
                comments: item.comments || '',
                updatedBy: item.updatedBy ? new Types.ObjectId(item.updatedBy) : undefined,
                updatedAt: new Date(),
            }))
            : defaultDepartments.map(dept => ({
                department: dept,
                status: ApprovalStatus.PENDING,
                comments: '',
                updatedAt: new Date(),
            }));

        const equipmentList = dto.equipmentList?.map(equip => ({
            equipmentId: equip.equipmentId ? new Types.ObjectId(equip.equipmentId) : undefined,
            name: equip.name,
            returned: equip.returned,
            condition: equip.condition || '',
        })) || [];

        const checklist = new this.clearanceChecklistModel({
            terminationId: new Types.ObjectId(dto.terminationId),
            items,
            equipmentList,
            cardReturned: dto.cardReturned || false,
        });

        return checklist.save();
    }

    async getClearanceChecklistByTerminationId(terminationId: string): Promise<ClearanceChecklist> {
        const checklist = await this.clearanceChecklistModel
            .findOne({ terminationId: new Types.ObjectId(terminationId) })
            .populate('terminationId')
            .exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist not found for termination request ${terminationId}`);
        }

        return checklist;
    }

    async getClearanceChecklistById(id: string): Promise<ClearanceChecklist> {
        const checklist = await this.clearanceChecklistModel
            .findById(id)
            .populate('terminationId')
            .exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${id} not found`);
        }

        return checklist;
    }

    async updateClearanceItem(checklistId: string, dto: UpdateClearanceItemDto): Promise<ClearanceChecklist> {
        this.validateObjectId(checklistId, 'checklistId');

        const checklist = await this.clearanceChecklistModel.findById(checklistId).populate('terminationId').exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        const termination = await this.terminationRequestModel.findById(checklist.terminationId).exec();
        if (!termination || termination.status !== TerminationStatus.APPROVED) {
            throw new BadRequestException('Cannot update clearance items for non-approved termination requests');
        }

        const itemIndex = checklist.items.findIndex(item => item.department === dto.department);

        if (itemIndex === -1) {
            throw new NotFoundException(`Department ${dto.department} not found in clearance checklist`);
        }

        checklist.items[itemIndex] = {
            department: dto.department,
            status: dto.status,
            comments: dto.comments || checklist.items[itemIndex].comments,
            updatedBy: new Types.ObjectId(dto.updatedBy),
            updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
        };

        const updated = await checklist.save();

        const allApproved = checklist.items.every(item => item.status === ApprovalStatus.APPROVED);
        const allEquipmentReturned = checklist.equipmentList.every(item => item.returned);

        if (allApproved && allEquipmentReturned && checklist.cardReturned) {
            const employee = await this.sharedRecruitmentService.validateEmployeeExists(termination.employeeId.toString());
            await this.sharedRecruitmentService.notifyClearanceComplete({
                employeeId: termination.employeeId.toString(),
                employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
                terminationId: termination._id.toString(),
            });
        }

        return updated;
    }

    async updateEquipmentItem(checklistId: string, equipmentName: string, dto: UpdateEquipmentItemDto): Promise<ClearanceChecklist> {
        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        const equipmentIndex = checklist.equipmentList.findIndex(item => item.name === equipmentName);

        if (equipmentIndex === -1) {
            throw new NotFoundException(`Equipment ${equipmentName} not found in clearance checklist`);
        }

        checklist.equipmentList[equipmentIndex] = {
            equipmentId: dto.equipmentId ? new Types.ObjectId(dto.equipmentId) : checklist.equipmentList[equipmentIndex].equipmentId,
            name: dto.name,
            returned: dto.returned,
            condition: dto.condition || checklist.equipmentList[equipmentIndex].condition,
        };

        return checklist.save();
    }

    async addEquipmentToChecklist(checklistId: string, dto: UpdateEquipmentItemDto): Promise<ClearanceChecklist> {
        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        checklist.equipmentList.push({
            equipmentId: dto.equipmentId ? new Types.ObjectId(dto.equipmentId) : undefined,
            name: dto.name,
            returned: dto.returned,
            condition: dto.condition || '',
        });

        return checklist.save();
    }

    async updateCardReturn(checklistId: string, cardReturned: boolean): Promise<ClearanceChecklist> {
        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        checklist.cardReturned = cardReturned;

        return checklist.save();
    }

    async getClearanceCompletionStatus(checklistId: string): Promise<{
        checklistId: string;
        allDepartmentsCleared: boolean;
        allEquipmentReturned: boolean;
        cardReturned: boolean;
        fullyCleared: boolean;
        pendingDepartments: string[];
        pendingEquipment: string[];
    }> {
        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        const allDepartmentsCleared = checklist.items.every(item => item.status === ApprovalStatus.APPROVED);
        const allEquipmentReturned = checklist.equipmentList.every(item => item.returned);
        const cardReturned = checklist.cardReturned;

        const pendingDepartments = checklist.items
            .filter(item => item.status !== ApprovalStatus.APPROVED)
            .map(item => item.department);

        const pendingEquipment = checklist.equipmentList
            .filter(item => !item.returned)
            .map(item => item.name);

        const fullyCleared = allDepartmentsCleared && allEquipmentReturned && cardReturned;

        return {checklistId, allDepartmentsCleared, allEquipmentReturned, cardReturned, fullyCleared, pendingDepartments, pendingEquipment,};
    }

    async revokeSystemAccess(dto: RevokeAccessDto): Promise<{
        success: boolean;
        employeeId: string;
        message: string;
        revokedAt: Date;
        details: {
            employeeDeactivated: boolean;
            systemRolesDisabled: number;
        };
    }> {
        this.validateObjectId(dto.employeeId, 'employeeId');

        const employee = await this.employeeProfileModel.findById(dto.employeeId).exec();
        if (!employee) {
            throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
        }

        const terminationRequest = await this.terminationRequestModel
            .findOne({
                employeeId: new Types.ObjectId(dto.employeeId),
                status: TerminationStatus.APPROVED
            })
            .exec();

        if (!terminationRequest) {
            throw new BadRequestException(
                'No approved termination request found for this employee. Access revocation requires approved termination.'
            );
        }

        // Check if already terminated
        if (employee.status === EmployeeStatus.TERMINATED) {
            return {
                success: true,
                employeeId: dto.employeeId,
                message: 'Employee already terminated. Access was already revoked.',
                revokedAt: new Date(),
                details: {
                    employeeDeactivated: true,
                    systemRolesDisabled: 0,
                },
            };
        }

        // 1. Update employee status to TERMINATED
        employee.status = EmployeeStatus.TERMINATED;
        employee.statusEffectiveFrom = new Date();
        await employee.save();

        // 2. Disable all system roles for this employee
        const roleUpdateResult = await this.employeeSystemRoleModel.updateMany(
            { employeeProfileId: new Types.ObjectId(dto.employeeId) },
            { $set: { isActive: false } }
        ).exec();

        // 3. Notify relevant parties
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        await this.sharedRecruitmentService.notifyHRUsers(
            'SYSTEM_ACCESS_REVOKED',
            `System access revoked for ${employeeName} (${employee.employeeNumber}). All roles disabled.`
        );

        await this.sharedRecruitmentService.notifyITAdmins(
            'ACCESS_REVOCATION_COMPLETED',
            `Access revocation completed for ${employeeName} (${employee.employeeNumber}). Employee status: TERMINATED.`
        );

        this.logger.log(`System access revoked for employee ${dto.employeeId}: ${roleUpdateResult.modifiedCount} roles disabled`);

        return {
            success: true,
            employeeId: dto.employeeId,
            message: 'System access revoked successfully. Employee terminated and all roles disabled.',
            revokedAt: new Date(),
            details: {
                employeeDeactivated: true,
                systemRolesDisabled: roleUpdateResult.modifiedCount,
            },
        };
    }

    async triggerFinalSettlement(dto: TriggerFinalSettlementDto): Promise<{
        success: boolean;
        terminationId: string;
        message: string;
        triggeredAt: Date;
        leaveEncashment?: {
            unusedDays: number;
            encashmentAmount: number;
        };
        terminationBenefit?: {
            benefitId: string;
            amount: number;
        };
    }> {
        this.validateObjectId(dto.terminationId, 'terminationId');

        const terminationRequest = await this.terminationRequestModel
            .findById(dto.terminationId)
            .exec();

        if (!terminationRequest) {
            throw new NotFoundException(`Termination request with ID ${dto.terminationId} not found`);
        }

        if (terminationRequest.status !== TerminationStatus.APPROVED) {
            throw new BadRequestException('Final settlement can only be triggered for approved termination requests');
        }

        const clearanceChecklist = await this.clearanceChecklistModel
            .findOne({ terminationId: new Types.ObjectId(dto.terminationId) })
            .exec();

        if (clearanceChecklist) {
            const completionStatus = await this.getClearanceCompletionStatus(clearanceChecklist._id.toString());

            if (!completionStatus.fullyCleared) {
                throw new BadRequestException(
                    `Clearance checklist is not fully complete. Pending: ${completionStatus.pendingDepartments.join(', ')}`
                );
            }
        }

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(terminationRequest.employeeId.toString());
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
        const employeeId = terminationRequest.employeeId.toString();

        // Integration with Leaves Module - Fetch employee leave balance and calculate unused annual leave encashment
        let leaveEncashment: { unusedDays: number; encashmentAmount: number } | undefined;
        try {
            leaveEncashment = await this.calculateLeaveEncashment(employeeId);
            this.logger.log(`Leave encashment calculated for employee ${employeeId}: ${leaveEncashment.unusedDays} days, ${leaveEncashment.encashmentAmount} amount`);
        } catch (err) {
            this.logger.warn(`Failed to calculate leave encashment for employee ${employeeId}: ${err.message}`);
        }

        // Integration with Payroll Module - Create termination benefit record
        let terminationBenefit: { benefitId: string; amount: number } | undefined;
        try {
            terminationBenefit = await this.createTerminationBenefitRecord(
                employeeId,
                dto.terminationId,
                leaveEncashment?.encashmentAmount || 0
            );
            this.logger.log(`Termination benefit created for employee ${employeeId}: ${terminationBenefit.amount} amount`);
        } catch (err) {
            this.logger.warn(`Failed to create termination benefit for employee ${employeeId}: ${err.message}`);
        }

        await this.sharedRecruitmentService.notifyFinalSettlementTriggered({
            employeeId,
            employeeName,
            terminationId: dto.terminationId,
        });

        return {
            success: true,
            terminationId: dto.terminationId,
            message: 'Final settlement triggered. Benefits termination scheduled and final pay calculation initiated.',
            triggeredAt: new Date(),
            leaveEncashment,
            terminationBenefit,
        };
    }

    /**
     * Integration with Leaves Module
     * Fetches employee leave balances and calculates unused annual leave encashment
     * BR 9, 11: Unused annuals encashed at termination
     */
    private async calculateLeaveEncashment(employeeId: string): Promise<{
        unusedDays: number;
        encashmentAmount: number;
    }> {
        // Fetch employee entitlements
        const entitlements = await this.leaveEntitlementModel.find({
            employeeId: new Types.ObjectId(employeeId),
        }).exec();

        if (!entitlements || entitlements.length === 0) {
            return { unusedDays: 0, encashmentAmount: 0 };
        }

        // Fetch leave types to identify annual leave types (encashable)
        const leaveTypeIds = entitlements.map(e => e.leaveTypeId);
        const leaveTypes = await this.leaveTypeModel.find({
            _id: { $in: leaveTypeIds },
        }).exec();

        // Calculate total unused days for encashable leave types
        let totalUnusedDays = 0;
        for (const entitlement of entitlements) {
            const leaveType = leaveTypes.find(lt => lt._id.toString() === entitlement.leaveTypeId?.toString());

            // Check if this leave type is encashable (annual leave types typically are)
            const isEncashable = (leaveType as any)?.isEncashable !== false &&
                                 ((leaveType as any)?.code === 'ANNUAL' ||
                                  leaveType?.name?.toLowerCase().includes('annual') ||
                                  (leaveType as any)?.category === 'annual');

            if (isEncashable) {
                // Calculate taken days from approved leave requests
                const takenAgg = await this.leaveRequestModel.aggregate([
                    {
                        $match: {
                            employeeId: new Types.ObjectId(employeeId),
                            leaveTypeId: entitlement.leaveTypeId,
                            status: LeaveStatus.APPROVED,
                        },
                    },
                    { $group: { _id: null, takenDays: { $sum: '$durationDays' } } },
                ]);

                const takenDays = takenAgg[0]?.takenDays ?? 0;
                const accrued = (entitlement as any).accruedRounded ?? (entitlement as any).accruedActual ?? entitlement.yearlyEntitlement ?? 0;
                const carryForward = (entitlement as any).carryForward ?? 0;
                const taken = (entitlement as any).taken ?? 0;
                const remaining = Math.max(0, accrued + carryForward - takenDays - taken);

                totalUnusedDays += remaining;
            }
        }

        // Calculate encashment amount based on daily rate
        let dailyRate = 0;
        try {
            const employeeProfile = await this.employeeProfileModel.findById(employeeId).exec();

            if (employeeProfile?.payGradeId) {
                const payGradeDoc = await this.payGradeModel.findById(employeeProfile.payGradeId).exec();

                if (payGradeDoc?.baseSalary) {
                    // Calculate daily rate (assuming 22 working days per month)
                    dailyRate = payGradeDoc.baseSalary / 22;
                }
            }

            // Fallback: Try to get from contract if pay grade not found
            if (dailyRate === 0) {
                const contract = await this.contractModel.findOne({
                    offerId: { $exists: true },
                }).sort({ createdAt: -1 }).exec();

                if (contract?.grossSalary) {
                    dailyRate = contract.grossSalary / 22;
                }
            }
        } catch (err) {
            this.logger.warn(`Failed to fetch daily rate for employee ${employeeId}: ${err.message}`);
        }

        const encashmentAmount = Math.round(totalUnusedDays * dailyRate * 100) / 100;

        return {
            unusedDays: totalUnusedDays,
            encashmentAmount,
        };
    }

    /**
     * Integration with Payroll Module
     * Creates termination/resignation benefit record in payroll execution
     * BR 29, BR 56: Auto-calculate termination/resignation benefits
     */
    private async createTerminationBenefitRecord(
        employeeId: string,
        terminationId: string,
        leaveEncashmentAmount: number
    ): Promise<{
        benefitId: string;
        amount: number;
    }> {
        // Check if benefit record already exists
        const existingBenefit = await this.employeeTerminationResignationModel.findOne({
            employeeId: new Types.ObjectId(employeeId),
            terminationId: new Types.ObjectId(terminationId),
        }).exec();

        if (existingBenefit) {
            return {
                benefitId: existingBenefit._id.toString(),
                amount: existingBenefit.givenAmount || 0,
            };
        }

        // Fetch termination benefit configuration
        const benefitConfig = await this.terminationBenefitsModel.findOne({
            status: 'approved',
        }).exec();

        // Calculate total benefit amount
        let baseAmount = 0;
        if (benefitConfig) {
            baseAmount = (benefitConfig as any).amount || 0;
        }

        // Add leave encashment to the total
        const totalAmount = baseAmount + leaveEncashmentAmount;

        // Create the benefit record
        const benefitRecord = await this.employeeTerminationResignationModel.create({
            employeeId: new Types.ObjectId(employeeId),
            benefitId: benefitConfig?._id || new Types.ObjectId(),
            terminationId: new Types.ObjectId(terminationId),
            givenAmount: totalAmount,
            status: BenefitStatus.PENDING,
        });

        return {
            benefitId: benefitRecord._id.toString(),
            amount: totalAmount,
        };
    }

    async getAllClearanceChecklists(): Promise<ClearanceChecklist[]> {
        return this.clearanceChecklistModel
            .find()
            .populate('terminationId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async deleteTerminationRequest(id: string): Promise<{ message: string; deletedId: string }> {
        const request = await this.terminationRequestModel.findById(id).exec();

        if (!request) {
            throw new NotFoundException(`Termination request with ID ${id} not found`);
        }

        if (request.status === TerminationStatus.APPROVED) {
            throw new BadRequestException('Cannot delete an approved termination request');
        }

        await this.terminationRequestModel.findByIdAndDelete(id).exec();

        await this.clearanceChecklistModel.deleteOne({ terminationId: new Types.ObjectId(id) }).exec();

        return {message: 'Termination request deleted successfully', deletedId: id,};
    }
}

