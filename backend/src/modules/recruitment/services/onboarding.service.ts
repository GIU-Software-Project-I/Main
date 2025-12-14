import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { Onboarding, OnboardingDocument } from '../models/onboarding.schema';
import { Contract, ContractDocument } from '../models/contract.schema';
import { Document, DocumentDocument } from '../models/document.schema';
import { Offer, OfferDocument } from '../models/offer.schema';

// Payroll Models
import { employeeSigningBonus, employeeSigningBonusDocument } from '../../payroll/payroll-execution/models/EmployeeSigningBonus.schema';
import { signingBonus, signingBonusDocument } from '../../payroll/payroll-configuration/models/signingBonus.schema';
import { employeePayrollDetails, employeePayrollDetailsDocument } from '../../payroll/payroll-execution/models/employeePayrollDetails.schema';
import { payrollRuns, payrollRunsDocument } from '../../payroll/payroll-execution/models/payrollRuns.schema';
import { BonusStatus, BankStatus } from '../../payroll/payroll-execution/enums/payroll-execution-enum';
import { ConfigStatus } from '../../payroll/payroll-configuration/enums/payroll-configuration-enums';

// Payroll Service
import { PayrollExecutionService } from '../../payroll/payroll-execution/services/payroll-execution.service';

// DTOs
import {CreateOnboardingDto, CreateOnboardingTaskDto, UpdateTaskStatusDto, UploadDocumentDto, ReserveEquipmentDto, ProvisionAccessDto, TriggerPayrollInitiationDto, ScheduleAccessRevocationDto, CancelOnboardingDto,} from '../dto/onboarding';

// Enums
import { OnboardingTaskStatus } from '../enums/onboarding-task-status.enum';

// Shared Services
import { SharedRecruitmentService } from '../../shared/services/shared-recruitment.service';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        @InjectModel(Onboarding.name) private onboardingModel: Model<OnboardingDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
        @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
        // Payroll Models
        @InjectModel(employeeSigningBonus.name) private employeeSigningBonusModel: Model<employeeSigningBonusDocument>,
        @InjectModel(signingBonus.name) private signingBonusModel: Model<signingBonusDocument>,
        @InjectModel(employeePayrollDetails.name) private employeePayrollDetailsModel: Model<employeePayrollDetailsDocument>,
        @InjectModel(payrollRuns.name) private payrollRunsModel: Model<payrollRunsDocument>,
        // Services
        @Inject(forwardRef(() => PayrollExecutionService)) private readonly payrollExecutionService: PayrollExecutionService,
        private readonly sharedRecruitmentService: SharedRecruitmentService,
    ) {}

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    async createOnboarding(dto: CreateOnboardingDto): Promise<Onboarding> {
        this.validateObjectId(dto.employeeId, 'employeeId');
        this.validateObjectId(dto.contractId, 'contractId');

        const contract = await this.contractModel.findById(dto.contractId).exec();
        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        if (!contract.employeeSignedAt || !contract.employerSignedAt) {
            throw new BadRequestException('Contract must be fully signed (by both employee and employer) before creating onboarding');
        }

        const existingByEmployee = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(dto.employeeId) })
            .exec();

        if (existingByEmployee) {
            throw new ConflictException('Onboarding checklist already exists for this employee');
        }

        const existingByContract = await this.onboardingModel
            .findOne({ contractId: new Types.ObjectId(dto.contractId) })
            .exec();

        if (existingByContract) {
            throw new ConflictException('Onboarding checklist already exists for this contract');
        }

        if (!dto.tasks || dto.tasks.length === 0) {
            throw new BadRequestException(
                'Onboarding tasks must be provided.'
            );
        }

        const tasks = dto.tasks.map(task => ({
            name: task.name,
            department: task.department,
            status: OnboardingTaskStatus.PENDING,
            deadline: task.deadline ? new Date(task.deadline) : undefined,
            documentId: task.documentId ? new Types.ObjectId(task.documentId) : undefined,
            notes: task.notes || '',
        }));

        const onboarding = new this.onboardingModel({
            employeeId: new Types.ObjectId(dto.employeeId),
            contractId: new Types.ObjectId(dto.contractId),
            tasks,
            completed: false,
        });

        return onboarding.save();
    }

    async getContractDetails(contractId: string): Promise<Contract> {
        const contract = await this.contractModel
            .findById(contractId)
            .populate('offerId')
            .populate('documentId')
            .exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        if (!contract.employeeSignedAt || !contract.employerSignedAt) {
            throw new BadRequestException('Contract must be fully signed before creating employee profile');
        }

        return contract;
    }

    async createEmployeeFromContract(contractId: string): Promise<{
        employee: any;
        temporaryPassword: string;
        contract: Contract;
    }> {
        const contract = await this.contractModel
            .findById(contractId)
            .populate('offerId')
            .exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        if (!contract.employeeSignedAt || !contract.employerSignedAt) {
            throw new BadRequestException('Contract must be fully signed before creating employee profile');
        }

        const offer = await this.offerModel.findById(contract.offerId).exec();
        if (!offer) {
            throw new NotFoundException('Associated offer not found');
        }

        const { employee, temporaryPassword } = await this.sharedRecruitmentService.createEmployeeFromContract({
            candidateId: offer.candidateId.toString(),
            role: contract.role,
            grossSalary: contract.grossSalary,
            signingBonus: contract.signingBonus,
            benefits: contract.benefits,
            acceptanceDate: contract.acceptanceDate,
        });

        return { employee, temporaryPassword, contract };
    }

    async getOnboardingByEmployeeId(employeeId: string): Promise<Onboarding> {
        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .populate('contractId')
            .populate('tasks.documentId')
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        return onboarding;
    }

    async getAllOnboardings(): Promise<Onboarding[]> {
        return this.onboardingModel
            .find()
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getOnboardingById(id: string): Promise<Onboarding> {
        const onboarding = await this.onboardingModel
            .findById(id)
            .populate('contractId')
            .populate('tasks.documentId')
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${id} not found`);
        }

        return onboarding;
    }

    async updateTaskStatus(
        onboardingId: string,
        taskName: string,
        dto: UpdateTaskStatusDto,
    ): Promise<Onboarding> {
        this.validateObjectId(onboardingId, 'onboardingId');

        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed && dto.status !== OnboardingTaskStatus.COMPLETED) {
            throw new BadRequestException('Cannot modify tasks on a completed onboarding checklist');
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);

        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found in onboarding checklist`);
        }

        onboarding.tasks[taskIndex].status = dto.status;
        if (dto.completedAt) {
            onboarding.tasks[taskIndex].completedAt = new Date(dto.completedAt);
        }

        const allCompleted = onboarding.tasks.every(t => t.status === OnboardingTaskStatus.COMPLETED);
        if (allCompleted) {
            onboarding.completed = true;
            onboarding.completedAt = new Date();
        }

        return onboarding.save();
    }

    async addTask(onboardingId: string, dto: CreateOnboardingTaskDto): Promise<Onboarding> {
        this.validateObjectId(onboardingId, 'onboardingId');

        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Cannot add tasks to a completed onboarding checklist');
        }

        const existingTask = onboarding.tasks.find(t => t.name === dto.name);
        if (existingTask) {
            throw new ConflictException(`Task with name "${dto.name}" already exists in this onboarding checklist`);
        }

        onboarding.tasks.push({
            name: dto.name,
            department: dto.department,
            status: OnboardingTaskStatus.PENDING,
            deadline: dto.deadline ? new Date(dto.deadline) : undefined,
            documentId: dto.documentId ? new Types.ObjectId(dto.documentId) : undefined,
            notes: dto.notes || '',
        });

        return onboarding.save();
    }

    async getPendingTasks(employeeId: string): Promise<{
        employeeId: string;
        pendingTasks: any[];
        overdueTasks: any[];
    }> {
        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        const now = new Date();
        const pendingTasks = onboarding.tasks.filter(
            t => t.status === OnboardingTaskStatus.PENDING || t.status === OnboardingTaskStatus.IN_PROGRESS
        );

        const overdueTasks = pendingTasks.filter(t => t.deadline && new Date(t.deadline) < now);

        for (const task of pendingTasks) {
            const isOverdue = task.deadline && new Date(task.deadline) < now;
            await this.sharedRecruitmentService.sendOnboardingTaskReminder({
                employeeId,
                taskName: task.name,
                deadline: task.deadline,
                isOverdue,
            });
        }

        return { employeeId, pendingTasks, overdueTasks };
    }

    async uploadDocument(dto: UploadDocumentDto): Promise<Document> {
        await this.sharedRecruitmentService.validateEmployeeExists(dto.ownerId).catch(async () => {
            await this.sharedRecruitmentService.validateCandidateExists(dto.ownerId);
        });

        const document = new this.documentModel({
            ownerId: new Types.ObjectId(dto.ownerId),
            type: dto.type,
            filePath: dto.filePath,
            uploadedAt: new Date(),
        });

        const savedDoc = await document.save();

        await this.sharedRecruitmentService.notifyDocumentUploaded({
            ownerId: dto.ownerId,
            ownerName: dto.ownerId,
            documentType: dto.type,
        });

        return savedDoc;
    }

    async getDocumentsByOwner(ownerId: string): Promise<Document[]> {
        return this.documentModel
            .find({ ownerId: new Types.ObjectId(ownerId) })
            .sort({ uploadedAt: -1 })
            .exec();
    }

    async linkDocumentToTask(onboardingId: string, taskName: string, documentId: string): Promise<Onboarding> {
        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);

        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found`);
        }

        onboarding.tasks[taskIndex].documentId = new Types.ObjectId(documentId);

        return onboarding.save();
    }

    async provisionSystemAccess(dto: ProvisionAccessDto): Promise<{
        success: boolean;
        employeeId: string;
        message: string;
        provisionedAt: Date;
    }> {
        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);

        await this.sharedRecruitmentService.notifySystemAccessProvisioned({
            employeeId: dto.employeeId,
            employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
            workEmail: employee.workEmail || '',
        });

        return {
            success: true,
            employeeId: dto.employeeId,
            message: 'System access provisioned successfully. Email, SSO, and internal systems enabled.',
            provisionedAt: new Date(),
        };
    }

    async reserveEquipment(dto: ReserveEquipmentDto): Promise<{
        success: boolean;
        employeeId: string;
        reservedItems: {
            equipment?: string[];
            deskNumber?: string;
            accessCardNumber?: string;
        };
        message: string;
    }> {
        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);

        await this.sharedRecruitmentService.notifyEquipmentReserved({
            employeeId: dto.employeeId,
            employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
            equipment: dto.equipment,
            deskNumber: dto.deskNumber,
            accessCardNumber: dto.accessCardNumber,
        });

        return {
            success: true,
            employeeId: dto.employeeId,
            reservedItems: {
                equipment: dto.equipment,
                deskNumber: dto.deskNumber,
                accessCardNumber: dto.accessCardNumber,
            },
            message: 'Equipment and resources reserved successfully. All items will be ready on Day 1.',
        };
    }

    async scheduleAccessRevocation(dto: ScheduleAccessRevocationDto): Promise<{
        success: boolean;
        employeeId: string;
        revocationDate?: string;
        message: string;
    }> {
        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);

        await this.sharedRecruitmentService.notifyAccessRevocationScheduled({
            employeeId: dto.employeeId,
            employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
            revocationDate: dto.revocationDate || 'On termination',
        });

        return {
            success: true,
            employeeId: dto.employeeId,
            revocationDate: dto.revocationDate,
            message: 'Access revocation scheduled successfully. Will be auto-executed on specified date or termination.',
        };
    }

    /**
     * REQ-PY-23: Trigger payroll initiation for new hire
     * Creates employee payroll details entry with pro-rated salary
     */
    async triggerPayrollInitiation(dto: TriggerPayrollInitiationDto): Promise<{
        success: boolean;
        contractId: string;
        message: string;
        triggeredAt: Date;
        payrollDetails?: {
            employeeId: string;
            baseSalary: number;
            proRatedSalary: number;
            startDate: Date;
            payrollRunId?: string;
        };
    }> {
        const contract = await this.contractModel.findById(dto.contractId).exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        // Find the onboarding record to get the employeeId
        const onboarding = await this.onboardingModel.findOne({
            contractId: new Types.ObjectId(dto.contractId)
        }).exec();

        if (!onboarding) {
            throw new BadRequestException('No onboarding record found for this contract. Please create onboarding first.');
        }

        const employeeId = onboarding.employeeId.toString();

        // Calculate pro-rated salary for current pay cycle
        const startDate = contract.acceptanceDate || new Date();
        const currentMonth = new Date();
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const startDay = new Date(startDate).getDate();
        const remainingDays = Math.max(1, daysInMonth - startDay + 1);
        const dailyRate = contract.grossSalary / daysInMonth;
        const proRatedSalary = Math.round(dailyRate * remainingDays * 100) / 100;

        let payrollRunId: string | undefined;

        try {
            // Find current active payroll run (draft or pending)
            const activePayrollRun = await this.payrollRunsModel.findOne({
                status: { $in: ['draft', 'under review', 'pending finance approval'] }
            }).sort({ payrollPeriod: -1 }).exec();

            if (activePayrollRun) {
                // Check if employee already has payroll details for this run
                const existingDetails = await this.employeePayrollDetailsModel.findOne({
                    employeeId: new Types.ObjectId(employeeId),
                    payrollRunId: activePayrollRun._id
                }).exec();

                if (!existingDetails) {
                    // Create employee payroll details entry
                    await this.employeePayrollDetailsModel.create({
                        employeeId: new Types.ObjectId(employeeId),
                        baseSalary: contract.grossSalary,
                        allowances: 0,
                        deductions: 0,
                        netSalary: proRatedSalary,
                        netPay: proRatedSalary,
                        bankStatus: BankStatus.MISSING,
                        exceptions: 'New hire - pro-rated salary for partial month',
                        bonus: 0,
                        benefit: 0,
                        payrollRunId: activePayrollRun._id
                    });

                    this.logger.log(`Payroll details created for employee ${employeeId} in run ${activePayrollRun.runId}`);
                } else {
                    this.logger.log(`Payroll details already exist for employee ${employeeId}`);
                }

                payrollRunId = activePayrollRun._id.toString();
            } else {
                this.logger.warn(`No active payroll run found. Employee ${employeeId} will be added to next cycle.`);
            }
        } catch (err) {
            this.logger.error(`Failed to create payroll details: ${err.message}`);
            throw new BadRequestException(`Failed to create payroll details: ${err.message}`);
        }

        return {
            success: true,
            contractId: dto.contractId,
            message: payrollRunId
                ? 'Payroll initiation triggered successfully. Employee added to current payroll cycle.'
                : 'Payroll initiation triggered. Employee will be added to next payroll cycle.',
            triggeredAt: new Date(),
            payrollDetails: {
                employeeId,
                baseSalary: contract.grossSalary,
                proRatedSalary,
                startDate: new Date(startDate),
                payrollRunId
            }
        };
    }

    /**
     * REQ-PY-27: Process signing bonus for new hire
     * BR 28: Signing bonus disbursed only once
     */
    async processSigningBonus(contractId: string): Promise<{
        success: boolean;
        contractId: string;
        bonusAmount: number;
        message: string;
        bonusDetails?: {
            bonusRecordId: string;
            employeeId: string;
            signingBonusConfigId: string;
            scheduledPaymentDate?: Date;
            status: string;
        };
    }> {
        const contract = await this.contractModel.findById(contractId).exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        if (!contract.signingBonus || contract.signingBonus === 0) {
            throw new BadRequestException('No signing bonus specified in contract');
        }

        // Find the onboarding record to get the employeeId
        const onboarding = await this.onboardingModel.findOne({
            contractId: new Types.ObjectId(contractId)
        }).exec();

        if (!onboarding) {
            throw new BadRequestException('No onboarding record found for this contract. Please create onboarding first.');
        }

        const employeeId = onboarding.employeeId.toString();

        // BR 28: Check if signing bonus already exists for this employee (disbursed only once)
        const existingBonus = await this.employeeSigningBonusModel.findOne({
            employeeId: new Types.ObjectId(employeeId)
        }).exec();

        if (existingBonus) {
            return {
                success: true,
                contractId,
                bonusAmount: existingBonus.givenAmount,
                message: 'Signing bonus already processed for this employee (BR 28: disbursed only once).',
                bonusDetails: {
                    bonusRecordId: existingBonus._id.toString(),
                    employeeId,
                    signingBonusConfigId: existingBonus.signingBonusId?.toString() || '',
                    scheduledPaymentDate: existingBonus.paymentDate,
                    status: existingBonus.status
                }
            };
        }

        // Find or create signing bonus configuration based on role/position
        let signingBonusConfig = await this.signingBonusModel.findOne({
            positionName: contract.role || 'Unknown',
            amount: contract.signingBonus
        }).exec();

        if (!signingBonusConfig) {
            // Create new signing bonus configuration
            signingBonusConfig = await this.signingBonusModel.create({
                positionName: contract.role || 'Unknown',
                amount: contract.signingBonus,
                status: ConfigStatus.APPROVED
            });
            this.logger.log(`Created signing bonus config for position ${contract.role}: ${contract.signingBonus}`);
        }

        // Schedule payment for first paycheck (first of next month)
        const paymentDate = new Date();
        paymentDate.setMonth(paymentDate.getMonth() + 1);
        paymentDate.setDate(1);

        // Create employee signing bonus record
        const bonusRecord = await this.employeeSigningBonusModel.create({
            employeeId: new Types.ObjectId(employeeId),
            signingBonusId: signingBonusConfig._id,
            givenAmount: contract.signingBonus,
            paymentDate: paymentDate,
            status: BonusStatus.PENDING
        });

        this.logger.log(`Signing bonus record created for employee ${employeeId}: ${contract.signingBonus}`);

        return {
            success: true,
            contractId,
            bonusAmount: contract.signingBonus,
            message: `Signing bonus of ${contract.signingBonus} scheduled for processing.`,
            bonusDetails: {
                bonusRecordId: bonusRecord._id.toString(),
                employeeId,
                signingBonusConfigId: signingBonusConfig._id.toString(),
                scheduledPaymentDate: paymentDate,
                status: BonusStatus.PENDING
            }
        };
    }

    async cancelOnboarding(onboardingId: string, dto: CancelOnboardingDto): Promise<{
        success: boolean;
        onboardingId: string;
        message: string;
        cancelledAt: Date;
    }> {
        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Cannot cancel completed onboarding');
        }

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(onboarding.employeeId.toString());
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        await this.sharedRecruitmentService.deactivateEmployee(onboarding.employeeId.toString(), dto.reason);

        await this.sharedRecruitmentService.notifyOnboardingCancelled({
            employeeId: onboarding.employeeId.toString(),
            employeeName,
            reason: dto.reason,
        });

        await this.onboardingModel.findByIdAndDelete(onboardingId).exec();

        return {
            success: true,
            onboardingId,
            message: `Onboarding cancelled due to: ${dto.reason}. Employee profile terminated.`,
            cancelledAt: new Date(),
        };
    }

    async getOnboardingProgress(onboardingId: string): Promise<{
        onboardingId: string;
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        inProgressTasks: number;
        progressPercentage: number;
        isComplete: boolean;
    }> {
        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        const totalTasks = onboarding.tasks.length;
        const completedTasks = onboarding.tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length;
        const pendingTasks = onboarding.tasks.filter(t => t.status === OnboardingTaskStatus.PENDING).length;
        const inProgressTasks = onboarding.tasks.filter(t => t.status === OnboardingTaskStatus.IN_PROGRESS).length;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            onboardingId,
            totalTasks,
            completedTasks,
            pendingTasks,
            inProgressTasks,
            progressPercentage,
            isComplete: onboarding.completed,
        };
    }
}

