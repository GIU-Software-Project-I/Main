import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { JobTemplate, JobTemplateDocument } from '../models/job-template.schema';
import { JobRequisition, JobRequisitionDocument } from '../models/job-requisition.schema';
import { Application, ApplicationDocument } from '../models/application.schema';
import { ApplicationStatusHistory, ApplicationStatusHistoryDocument } from '../models/application-history.schema';
import { Referral, ReferralDocument } from '../models/referral.schema';
import { Interview, InterviewDocument } from '../models/interview.schema';
import { AssessmentResult, AssessmentResultDocument } from '../models/assessment-result.schema';
import { Offer, OfferDocument } from '../models/offer.schema';
import { Contract, ContractDocument } from '../models/contract.schema';

// DTOs
import {CreateJobTemplateDto, UpdateJobTemplateDto, CreateJobRequisitionDto, PublishJobRequisitionDto, UpdateJobRequisitionDto, CreateApplicationDto, UpdateApplicationStageDto, UpdateApplicationStatusDto, AssignHrDto, CreateReferralDto, ScheduleInterviewDto, UpdateInterviewDto, SubmitFeedbackDto, CreateOfferDto, ApproveOfferDto, CandidateOfferResponseDto, SendNotificationDto, SendRejectionDto,} from '../dto/recruitment';

// Enums
import { ApplicationStage } from '../enums/application-stage.enum';
import { ApplicationStatus } from '../enums/application-status.enum';
import { InterviewStatus } from '../enums/interview-status.enum';
import { OfferFinalStatus } from '../enums/offer-final-status.enum';
import { OfferResponseStatus } from '../enums/offer-response-status.enum';
import { ApprovalStatus } from '../enums/approval-status.enum';

// Shared Services
import { SharedRecruitmentService } from '../../shared/services/shared-recruitment.service';

@Injectable()
export class RecruitmentService {
    constructor(
        @InjectModel(JobTemplate.name) private jobTemplateModel: Model<JobTemplateDocument>,
        @InjectModel(JobRequisition.name) private jobRequisitionModel: Model<JobRequisitionDocument>,
        @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
        @InjectModel(ApplicationStatusHistory.name) private historyModel: Model<ApplicationStatusHistoryDocument>,
        @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
        @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
        @InjectModel(AssessmentResult.name) private assessmentModel: Model<AssessmentResultDocument>,
        @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        private readonly sharedRecruitmentService: SharedRecruitmentService,
    ) {}

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    async createJobTemplate(dto: CreateJobTemplateDto): Promise<JobTemplate> {



        const template = new this.jobTemplateModel(dto);
        return template.save();
    }

    async getAllJobTemplates(): Promise<JobTemplate[]> {
        return this.jobTemplateModel.find().exec();
    }

    async getJobTemplateById(id: string): Promise<JobTemplate> {
        this.validateObjectId(id, 'id');

        const template = await this.jobTemplateModel.findById(id).exec();
        if (!template) {
            throw new NotFoundException(`Job template with ID ${id} not found`);
        }
        return template;
    }

    async updateJobTemplate(id: string, dto: UpdateJobTemplateDto): Promise<JobTemplate> {
        this.validateObjectId(id, 'id');

        const template = await this.jobTemplateModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!template) {
            throw new NotFoundException(`Job template with ID ${id} not found`);
        }
        return template;
    }

    async deleteJobTemplate(id: string): Promise<{ deleted: boolean }> {
        this.validateObjectId(id, 'id');

        const result = await this.jobTemplateModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Job template with ID ${id} not found`);
        }
        return { deleted: true };
    }

    async createJobRequisition(dto: CreateJobRequisitionDto): Promise<JobRequisition> {
        this.validateObjectId(dto.hiringManagerId, 'hiringManagerId');
        if (dto.templateId) {
            this.validateObjectId(dto.templateId, 'templateId');
        }

        const count = await this.jobRequisitionModel.countDocuments();
        const requisitionId = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        const requisition = new this.jobRequisitionModel({
            requisitionId,
            templateId: dto.templateId ? new Types.ObjectId(dto.templateId) : undefined,
            openings: dto.openings,
            location: dto.location,
            hiringManagerId: new Types.ObjectId(dto.hiringManagerId),
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
            publishStatus: 'draft',
        });

        return requisition.save();
    }

    async getAllJobRequisitions(
        filters?: { status?: string; managerId?: string }
    ): Promise<JobRequisition[]> {
        const query: any = {};
        if (filters?.status) query.publishStatus = filters.status;
        if (filters?.managerId) query.hiringManagerId = new Types.ObjectId(filters.managerId);

        return this.jobRequisitionModel.find(query).exec();
    }

    async getJobRequisitionById(id: string): Promise<JobRequisition> {
        const requisition = await this.jobRequisitionModel
            .findOne({ requisitionId: id })
            .exec();

        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${id} not found`);
        }
        return requisition;
    }

    async getPublishedJobs(): Promise<JobRequisition[]> {
        return this.jobRequisitionModel.find({ publishStatus: 'published' }).exec();
    }

    async publishJobRequisition(id: string, dto: PublishJobRequisitionDto): Promise<JobRequisition> {
        const updateData: any = {
            publishStatus: dto.publishStatus,
        };

        if (dto.publishStatus === 'published') {
            updateData.postingDate = dto.postingDate ? new Date(dto.postingDate) : new Date();
        }

        const requisition = await this.jobRequisitionModel.findOneAndUpdate(
            { requisitionId: id },
            updateData,
            { new: true }
        ).exec();

        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${id} not found`);
        }

        return requisition;
    }

    async updateJobRequisition(id: string, dto: UpdateJobRequisitionDto): Promise<JobRequisition> {
        const updateData: any = { ...dto };
        if (dto.expiryDate) updateData.expiryDate = new Date(dto.expiryDate);

        const requisition = await this.jobRequisitionModel.findOneAndUpdate(
            { requisitionId: id },
            updateData,
            { new: true }
        ).exec();

        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${id} not found`);
        }
        return requisition;
    }

    async closeJobRequisition(id: string): Promise<JobRequisition> {
        return this.publishJobRequisition(id, { publishStatus: 'closed' });
    }

    async createApplication(dto: CreateApplicationDto): Promise<Application> {
        this.validateObjectId(dto.candidateId, 'candidateId');

        const requisition = await this.jobRequisitionModel.findOne({ requisitionId: dto.requisitionId }).exec();
        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${dto.requisitionId} not found`);
        }
        if (requisition.publishStatus !== 'published') {
            throw new BadRequestException('Cannot apply to unpublished job requisition');
        }

        if (requisition.expiryDate && new Date(requisition.expiryDate) < new Date()) {
            throw new BadRequestException('Cannot apply to expired job requisition');
        }

        const existingApp = await this.applicationModel.findOne({
            candidateId: new Types.ObjectId(dto.candidateId),
            requisitionId: requisition._id,
        }).exec();

        if (existingApp) {
            throw new ConflictException('Candidate has already applied for this position');
        }

        if (!dto.dataProcessingConsent) {
            throw new BadRequestException('Data processing consent is required to submit application');
        }

        const application = new this.applicationModel({
            candidateId: new Types.ObjectId(dto.candidateId),
            requisitionId: requisition._id,
            currentStage: ApplicationStage.SCREENING,
            status: ApplicationStatus.SUBMITTED,
        });

        const savedApp = await application.save();

        await this.logStatusChange(savedApp._id.toString(), {
            stage: ApplicationStage.SCREENING,
            status: ApplicationStatus.SUBMITTED,
            notes: 'Application submitted',
            changedBy: dto.candidateId || '507f1f77bcf86cd799439000',
        });

        return savedApp;
    }

    async getAllApplications(
        filters?: {
            requisitionId?: string;
            status?: ApplicationStatus;
            stage?: ApplicationStage;
            hrId?: string;
        }
    ): Promise<Application[]> {
        const query: any = {};

        if (filters?.requisitionId) {
            const requisition = await this.jobRequisitionModel
                .findOne({ requisitionId: filters.requisitionId })
                .exec();
            if (!requisition) {
                return [];
            }
            query.requisitionId = requisition._id;
        }

        if (filters?.status) query.status = filters.status;
        if (filters?.stage) query.currentStage = filters.stage;
        if (filters?.hrId) {
            if (Types.ObjectId.isValid(filters.hrId)) {
                query.assignedHr = new Types.ObjectId(filters.hrId);
            } else {
                return [];
            }
        }

        return this.applicationModel.find(query).exec();
    }

    async getApplicationById(id: string): Promise<Application> {
        const application = await this.applicationModel
            .findById(id)
            .exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }
        return application;
    }

    async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
        this.validateObjectId(candidateId, 'candidateId');

        return this.applicationModel
            .find({ candidateId: new Types.ObjectId(candidateId) })
            .exec();
    }

    async assignHrToApplication(applicationId: string, dto: AssignHrDto): Promise<Application> {
        this.validateObjectId(applicationId, 'applicationId');
        this.validateObjectId(dto.hrEmployeeId, 'hrEmployeeId');

        const application = await this.applicationModel.findByIdAndUpdate(
            applicationId,
            { assignedHr: new Types.ObjectId(dto.hrEmployeeId) },
            { new: true },
        ).exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${applicationId} not found`);
        }
        return application;
    }

    async updateApplicationStage(id: string, dto: UpdateApplicationStageDto): Promise<Application> {
        this.validateObjectId(id, 'id');

        const application = await this.applicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (application.status === ApplicationStatus.REJECTED) {
            throw new BadRequestException('Cannot update stage for a rejected application');
        }

        const oldStage = application.currentStage;
        const oldStatus = application.status;

        application.currentStage = dto.stage;
        if (dto.stage === ApplicationStage.OFFER) {
            application.status = ApplicationStatus.OFFER;
        }

        const updated = await application.save();

        await this.logStatusChange(id, {
            stage: dto.stage,
            status: application.status,
            notes: dto.notes,
            changedBy: dto.changedBy,
            oldStage: oldStage,
            oldStatus: oldStatus,
        });

        return updated;
    }

    async updateApplicationStatus(id: string, dto: UpdateApplicationStatusDto): Promise<Application> {
        this.validateObjectId(id, 'id');

        const application = await this.applicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (application.status === ApplicationStatus.HIRED && dto.status !== ApplicationStatus.HIRED) {
            throw new BadRequestException('Cannot change status of a hired application');
        }

        const oldStage = application.currentStage;
        const oldStatus = application.status;

        application.status = dto.status;
        const updated = await application.save();

        await this.logStatusChange(id, {
            stage: application.currentStage,
            status: dto.status,
            notes: dto.reason,
            oldStage: oldStage,
            oldStatus: oldStatus,
        });

        return updated;
    }

    async rejectApplication(id: string, reason?: string): Promise<Application> {
        this.validateObjectId(id, 'id');

        const application = await this.applicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (application.status === ApplicationStatus.HIRED) {
            throw new BadRequestException('Cannot reject an application that has already been hired');
        }

        if (application.status === ApplicationStatus.REJECTED) {
            throw new BadRequestException('Application is already rejected');
        }

        return this.updateApplicationStatus(id, {
            status: ApplicationStatus.REJECTED,
            reason: reason || 'Application rejected',
        });
    }

    async getApplicationHistory(applicationId: string): Promise<ApplicationStatusHistory[]> {
        if (!Types.ObjectId.isValid(applicationId)) {
            throw new BadRequestException(`Invalid application ID format: ${applicationId}`);
        }

        const application = await this.applicationModel.findById(applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${applicationId} not found`);
        }

        return this.historyModel
            .find({ applicationId: new Types.ObjectId(applicationId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    private async logStatusChange(applicationId: string, data: {
        stage: ApplicationStage;
        status: ApplicationStatus;
        notes?: string;
        changedBy?: string;
        oldStage?: ApplicationStage;
        oldStatus?: ApplicationStatus;
    }): Promise<void> {
        const history = new this.historyModel({
            applicationId: new Types.ObjectId(applicationId),
            oldStage: data.oldStage ? data.oldStage.toString() : null,
            newStage: data.stage.toString(),
            oldStatus: data.oldStatus ? data.oldStatus.toString() : null,
            newStatus: data.status.toString(),
            changedBy: data.changedBy ? new Types.ObjectId(data.changedBy) : new Types.ObjectId('507f1f77bcf86cd799439000'),
        });
        await history.save();
    }

    async getRecruitmentDashboard(): Promise<any> {
        const [
            totalOpenPositions,
            totalApplications,
            applicationsByStage,
            applicationsByStatus,
            recentApplications,
        ] = await Promise.all([
            this.jobRequisitionModel.countDocuments({ publishStatus: 'published' }),
            this.applicationModel.countDocuments(),
            this.applicationModel.aggregate([
                { $group: { _id: '$currentStage', count: { $sum: 1 } } },
            ]),
            this.applicationModel.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            this.applicationModel
                .find()
                .sort({ createdAt: -1 })
                .limit(10)
                .exec(),
        ]);

        return {
            totalOpenPositions,
            totalApplications,
            applicationsByStage,
            applicationsByStatus,
            recentApplications,
        };
    }

    async getRequisitionProgress(requisitionId: string): Promise<any> {
        const requisition = await this.jobRequisitionModel.findOne({ requisitionId }).exec();
        if (!requisition) {
            throw new NotFoundException(`Requisition not found`);
        }

        const applications = await this.applicationModel.find({
            requisitionId: requisition._id,
        }).exec();

        const stageBreakdown = {
            [ApplicationStage.SCREENING]: 0,
            [ApplicationStage.DEPARTMENT_INTERVIEW]: 0,
            [ApplicationStage.HR_INTERVIEW]: 0,
            [ApplicationStage.OFFER]: 0,
        };

        applications.forEach((app) => {
            stageBreakdown[app.currentStage]++;
        });

        const hiredCount = applications.filter(a => a.status === ApplicationStatus.HIRED).length;
        const progressPercentage = requisition.openings > 0
            ? Math.round((hiredCount / requisition.openings) * 100)
            : 0;

        return {
            requisitionId: requisition.requisitionId,
            openings: requisition.openings,
            hired: hiredCount,
            progressPercentage,
            totalApplications: applications.length,
            stageBreakdown,
        };
    }

    async createReferral(dto: CreateReferralDto): Promise<Referral> {
        this.validateObjectId(dto.candidateId, 'candidateId');
        this.validateObjectId(dto.referringEmployeeId, 'referringEmployeeId');

        const existing = await this.referralModel.findOne({
            candidateId: new Types.ObjectId(dto.candidateId),
        }).exec();

        if (existing) {
            throw new ConflictException('Candidate is already tagged as a referral');
        }

        const referral = new this.referralModel({
            referringEmployeeId: new Types.ObjectId(dto.referringEmployeeId),
            candidateId: new Types.ObjectId(dto.candidateId),
            role: dto.role,
            level: dto.level,
        });

        return referral.save();
    }

    async getReferralByCandidate(candidateId: string): Promise<Referral | null> {
        this.validateObjectId(candidateId, 'candidateId');

        return this.referralModel
            .findOne({ candidateId: new Types.ObjectId(candidateId) })
            .exec();
    }

    async getAllReferrals(): Promise<Referral[]> {
        return this.referralModel.find().exec();
    }

    async isReferral(candidateId: string): Promise<boolean> {
        this.validateObjectId(candidateId, 'candidateId');

        const referral = await this.referralModel.findOne({
            candidateId: new Types.ObjectId(candidateId),
        }).exec();
        return !!referral;
    }

    async scheduleInterview(dto: ScheduleInterviewDto): Promise<Interview> {
        this.validateObjectId(dto.applicationId, 'applicationId');
        dto.panel.forEach((id, index) => this.validateObjectId(id, `panel[${index}]`));

        const application = await this.applicationModel.findById(dto.applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        const invalidStatuses = [ApplicationStatus.REJECTED, ApplicationStatus.HIRED];
        if (invalidStatuses.includes(application.status)) {
            throw new BadRequestException(`Cannot schedule interview for application with status: ${application.status}`);
        }

        const scheduledDate = new Date(dto.scheduledDate);
        if (scheduledDate <= new Date()) {
            throw new BadRequestException('Interview date must be in the future');
        }

        const existingInterview = await this.interviewModel.findOne({
            applicationId: new Types.ObjectId(dto.applicationId),
            stage: dto.stage,
            status: { $ne: InterviewStatus.CANCELLED },
        }).exec();

        if (existingInterview) {
            throw new ConflictException(`An interview for stage ${dto.stage} already exists for this application`);
        }

        const interview = new this.interviewModel({
            applicationId: new Types.ObjectId(dto.applicationId),
            stage: dto.stage,
            scheduledDate: new Date(dto.scheduledDate),
            method: dto.method,
            panel: dto.panel.map(id => new Types.ObjectId(id)),
            videoLink: dto.videoLink,
            status: InterviewStatus.SCHEDULED,
        });

        const saved = await interview.save();

        await this.updateApplicationStage(dto.applicationId, {
            stage: dto.stage,
            notes: `Interview scheduled for ${dto.scheduledDate}`,
        });

        await this.sharedRecruitmentService.sendInterviewNotifications({
            candidateId: application.candidateId.toString(),
            panelMemberIds: dto.panel,
            interviewDate: new Date(dto.scheduledDate),
            interviewMethod: dto.method,
            videoLink: dto.videoLink,
            stage: dto.stage,
        });

        return saved;
    }

    async getInterviewById(id: string): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const interview = await this.interviewModel
            .findById(id)
            .exec();

        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }
        return interview;
    }

    async getInterviewsByApplication(applicationId: string): Promise<Interview[]> {
        this.validateObjectId(applicationId, 'applicationId');

        return this.interviewModel
            .find({ applicationId: new Types.ObjectId(applicationId) })
            .sort({ scheduledDate: 1 })
            .exec();
    }

    async getInterviewsByPanelist(panelistId: string): Promise<Interview[]> {
        this.validateObjectId(panelistId, 'panelistId');

        return this.interviewModel
            .find({ panel: new Types.ObjectId(panelistId) })
            .sort({ scheduledDate: 1 })
            .exec();
    }

    async getUpcomingInterviews(days: number = 7): Promise<Interview[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        return this.interviewModel
            .find({
                scheduledDate: { $gte: now, $lte: futureDate },
                status: InterviewStatus.SCHEDULED,
            })
            .sort({ scheduledDate: 1 })
            .exec();
    }

    async updateInterview(id: string, dto: UpdateInterviewDto): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const existingInterview = await this.interviewModel.findById(id).exec();
        if (!existingInterview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        if (existingInterview.status === InterviewStatus.COMPLETED) {
            throw new BadRequestException('Cannot update a completed interview');
        }
        if (existingInterview.status === InterviewStatus.CANCELLED) {
            throw new BadRequestException('Cannot update a cancelled interview');
        }

        const updateData: any = { ...dto };
        if (dto.scheduledDate) updateData.scheduledDate = new Date(dto.scheduledDate);
        if (dto.panel) updateData.panel = dto.panel.map(p => new Types.ObjectId(p));

        const interview = await this.interviewModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        return interview;
    }

    async completeInterview(id: string): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const interview = await this.interviewModel.findById(id).exec();
        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        if (interview.status !== InterviewStatus.SCHEDULED) {
            throw new BadRequestException(`Cannot complete interview with status: ${interview.status}. Only SCHEDULED interviews can be completed.`);
        }

        interview.status = InterviewStatus.COMPLETED;
        return interview.save();
    }

    async cancelInterview(id: string, reason: string): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const interview = await this.interviewModel.findById(id).exec();
        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        if (interview.status !== InterviewStatus.SCHEDULED) {
            throw new BadRequestException(`Cannot cancel interview with status: ${interview.status}. Only SCHEDULED interviews can be cancelled.`);
        }

        interview.status = InterviewStatus.CANCELLED;
        // TODO: add cancellationReason field to schema if needed
        return interview.save();
    }

    async submitFeedback(dto: SubmitFeedbackDto): Promise<AssessmentResult> {
        this.validateObjectId(dto.interviewId, 'interviewId');
        this.validateObjectId(dto.interviewerId, 'interviewerId');

        if (dto.score === undefined || dto.score === null || dto.score < 1 || dto.score > 10 || !Number.isFinite(dto.score)) {
            throw new BadRequestException('Score must be a number between 1 and 10');
        }

        const interview = await this.interviewModel.findById(dto.interviewId).exec();
        if (!interview) {
            throw new NotFoundException(`Interview with ID ${dto.interviewId} not found`);
        }

        if (interview.status === InterviewStatus.CANCELLED) {
            throw new BadRequestException('Cannot submit feedback for a cancelled interview');
        }

        const isInPanel = interview.panel.some(
            panelId => panelId.toString() === dto.interviewerId
        );
        if (!isInPanel) {
            throw new BadRequestException('Only panel members can submit feedback for this interview');
        }

        const existingFeedback = await this.assessmentModel.findOne({
            interviewId: dto.interviewId,
            interviewerId: dto.interviewerId,
        });

        if (existingFeedback) {
            throw new ConflictException('Feedback already submitted by this interviewer');
        }

        const assessment = new this.assessmentModel({
            interviewId: new Types.ObjectId(dto.interviewId),
            interviewerId: new Types.ObjectId(dto.interviewerId),
            score: dto.score,
            comments: dto.comments,
        });

        const saved = await assessment.save();

        await this.interviewModel.findByIdAndUpdate(dto.interviewId, {
            feedbackId: saved._id,
        });

        return saved;
    }

    async getFeedbackByInterview(interviewId: string): Promise<AssessmentResult[]> {
        this.validateObjectId(interviewId, 'interviewId');

        return this.assessmentModel
            .find({ interviewId: new Types.ObjectId(interviewId) })
            .exec();
    }

    async getFeedbackByApplication(applicationId: string): Promise<AssessmentResult[]> {
        this.validateObjectId(applicationId, 'applicationId');

        const interviews = await this.interviewModel.find({ applicationId: new Types.ObjectId(applicationId) });
        const interviewIds = interviews.map(i => i._id);

        return this.assessmentModel
            .find({ interviewId: { $in: interviewIds } })
            .exec();
    }

    async getAverageScore(applicationId: string): Promise<number> {
        this.validateObjectId(applicationId, 'applicationId');

        const interviews = await this.interviewModel.find({ applicationId: new Types.ObjectId(applicationId) });
        const interviewIds = interviews.map(i => i._id);

        const feedbacks = await this.assessmentModel.find({
            interviewId: { $in: interviewIds },
        }).exec();

        if (feedbacks.length === 0) return 0;

        const total = feedbacks.reduce((sum, f) => sum + (f.score || 0), 0);
        return Math.round((total / feedbacks.length) * 10) / 10;
    }

    async createOffer(dto: CreateOfferDto): Promise<Offer> {
        this.validateObjectId(dto.applicationId, 'applicationId');
        this.validateObjectId(dto.candidateId, 'candidateId');
        if (dto.hrEmployeeId) {
            this.validateObjectId(dto.hrEmployeeId, 'hrEmployeeId');
        }
        dto.approvers.forEach((a, index) => this.validateObjectId(a.employeeId, `approvers[${index}].employeeId`));

        const deadline = new Date(dto.deadline);
        if (deadline <= new Date()) {
            throw new BadRequestException('Offer deadline must be in the future');
        }

        const application = await this.applicationModel.findById(dto.applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        const existingOffer = await this.offerModel.findOne({
            applicationId: new Types.ObjectId(dto.applicationId),
            finalStatus: { $in: [OfferFinalStatus.PENDING, OfferFinalStatus.APPROVED] },
        }).exec();

        if (existingOffer) {
            throw new ConflictException('An active offer already exists for this application');
        }

        const approvers = dto.approvers.map(a => ({
            employeeId: new Types.ObjectId(a.employeeId),
            role: a.role,
            status: ApprovalStatus.PENDING,
        }));

        const offer = new this.offerModel({
            applicationId: new Types.ObjectId(dto.applicationId),
            candidateId: new Types.ObjectId(dto.candidateId),
            hrEmployeeId: dto.hrEmployeeId ? new Types.ObjectId(dto.hrEmployeeId) : undefined,
            role: dto.role,
            grossSalary: dto.grossSalary,
            signingBonus: dto.signingBonus,
            benefits: dto.benefits,
            insurances: dto.insurances,
            conditions: dto.conditions,
            content: dto.content,
            deadline: new Date(dto.deadline),
            approvers,
            applicantResponse: OfferResponseStatus.PENDING,
            finalStatus: OfferFinalStatus.PENDING,
        });

        const saved = await offer.save();

        await this.updateApplicationStage(dto.applicationId, {
            stage: ApplicationStage.OFFER,
            notes: 'Offer created, pending approvals',
        });

        return saved;
    }

    async getOfferById(id: string): Promise<Offer> {
        this.validateObjectId(id, 'id');

        const offer = await this.offerModel
            .findById(id)
            .exec();

        if (!offer) {
            throw new NotFoundException(`Offer with ID ${id} not found`);
        }
        return offer;
    }

    async getOfferByApplication(applicationId: string): Promise<Offer | null> {
        this.validateObjectId(applicationId, 'applicationId');

        return this.offerModel
            .findOne({ applicationId: new Types.ObjectId(applicationId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    async getPendingOffers(): Promise<Offer[]> {
        return this.offerModel.find({ finalStatus: OfferFinalStatus.PENDING }).exec();
    }

    async approveOffer(offerId: string, dto: ApproveOfferDto): Promise<Offer> {
        this.validateObjectId(offerId, 'offerId');
        this.validateObjectId(dto.approverId, 'approverId');

        const offer = await this.offerModel.findById(offerId).exec();
        if (!offer) {
            throw new NotFoundException(`Offer with ID ${offerId} not found`);
        }

        if (offer.finalStatus === OfferFinalStatus.REJECTED) {
            throw new BadRequestException('Cannot approve a rejected offer');
        }

        const approverIndex = offer.approvers.findIndex(
            a => a.employeeId.toString() === dto.approverId,
        );

        if (approverIndex === -1) {
            throw new BadRequestException('You are not an approver for this offer');
        }

        if (offer.approvers[approverIndex].status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('You have already submitted your approval decision');
        }

        offer.approvers[approverIndex].status = dto.status;
        offer.approvers[approverIndex].actionDate = new Date();
        offer.approvers[approverIndex].comment = dto.comment;

        const allApproved = offer.approvers.every(
            a => a.status === ApprovalStatus.APPROVED,
        );

        const anyRejected = offer.approvers.some(
            a => a.status === ApprovalStatus.REJECTED,
        );

        if (allApproved) {
            offer.finalStatus = OfferFinalStatus.APPROVED;
        } else if (anyRejected) {
            offer.finalStatus = OfferFinalStatus.REJECTED;
        }

        return offer.save();
    }

    async recordCandidateResponse(offerId: string, dto: CandidateOfferResponseDto): Promise<Offer> {
        this.validateObjectId(offerId, 'offerId');

        const offer = await this.offerModel.findById(offerId).exec();
        if (!offer) {
            throw new NotFoundException(`Offer with ID ${offerId} not found`);
        }

        if (offer.finalStatus !== OfferFinalStatus.APPROVED) {
            throw new BadRequestException('Offer has not been approved yet');
        }

        if (offer.applicantResponse !== OfferResponseStatus.PENDING) {
            throw new BadRequestException('Candidate has already responded to this offer');
        }

        if (offer.deadline && new Date(offer.deadline) < new Date()) {
            throw new BadRequestException('Offer deadline has passed');
        }

        offer.applicantResponse = dto.response;

        if (dto.response === OfferResponseStatus.ACCEPTED) {
            offer.candidateSignedAt = new Date();

            await this.applicationModel.findByIdAndUpdate(offer.applicationId, {
                status: ApplicationStatus.HIRED,
            });

            await this.createContractFromOffer(offer);
        }

        return offer.save();
    }

    private async createContractFromOffer(offer: OfferDocument): Promise<Contract> {
        const existingContract = await this.contractModel.findOne({ offerId: offer._id }).exec();
        if (existingContract) {
            throw new ConflictException('Contract already exists for this offer');
        }

        const contract = new this.contractModel({
            offerId: offer._id,
            acceptanceDate: new Date(),
            grossSalary: offer.grossSalary,
            signingBonus: offer.signingBonus,
            role: offer.role,
            benefits: offer.benefits,
        });

        return contract.save();
    }

    async triggerPreboarding(applicationId: string): Promise<{ triggered: boolean; message: string }> {
        const application = await this.applicationModel.findById(applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${applicationId} not found`);
        }

        if (application.status !== ApplicationStatus.HIRED) {
            throw new BadRequestException('Application must be in HIRED status to trigger preboarding');
        }

        // TODO: Integration with Onboarding module
        // This would create offboarding.requirements tasks and notify relevant parties

        return {
            triggered: true,
            message: 'Pre-boarding tasks triggered successfully. Onboarding module will be initialized.',
        };
    }

    async sendOfferLetter(offerId: string): Promise<{ sent: boolean; message: string }> {
        const offer = await this.offerModel
            .findById(offerId)
            .exec();

        if (!offer) {
            throw new NotFoundException(`Offer with ID ${offerId} not found`);
        }

        if (offer.finalStatus !== OfferFinalStatus.APPROVED) {
            throw new BadRequestException('Offer must be approved before sending');
        }

        await this.sharedRecruitmentService.sendOfferNotification({
            candidateId: offer.candidateId.toString(),
            offerId: offerId,
            role: offer.role,
            deadline: offer.deadline,
        });

        return {
            sent: true,
            message: 'Offer letter sent successfully to candidate email.',
        };
    }

    async sendStatusUpdateNotification(dto: SendNotificationDto): Promise<{ sent: boolean; message: string }> {
        const application = await this.applicationModel
            .findById(dto.applicationId)
            .exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        await this.sharedRecruitmentService.sendApplicationStatusNotification({
            candidateId: application.candidateId.toString(),
            applicationId: dto.applicationId,
            status: application.status,
            message: dto.content,
        });

        return {
            sent: true,
            message: 'Status update notification sent successfully.',
        };
    }

    async sendRejectionNotification(dto: SendRejectionDto): Promise<{ sent: boolean; message: string }> {
        const application = await this.applicationModel
            .findById(dto.applicationId)
            .exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        await this.updateApplicationStatus(dto.applicationId, {
            status: ApplicationStatus.REJECTED,
            reason: dto.rejectionReason || 'Application not selected',
        });

        await this.sharedRecruitmentService.sendRejectionNotification({
            candidateId: application.candidateId.toString(),
            applicationId: dto.applicationId,
            rejectionReason: dto.rejectionReason,
        });

        return {
            sent: true,
            message: 'Rejection notification sent successfully.',
        };
    }

    async getEmailTemplates(): Promise<any[]> {
        // TODO: Implement email template management
        // This would return available email templates for different notification types

        return [
            {
                id: '1',
                name: 'Standard Rejection',
                type: 'rejection',
                subject: 'Update on your application',
                body: 'Thank you for your interest in {{position}}. After careful consideration...',
            },
            {
                id: '2',
                name: 'Interview Invitation',
                type: 'interview_invitation',
                subject: 'Interview Invitation for {{position}}',
                body: 'We are pleased to invite you for an interview for the {{position}} role...',
            },
            {
                id: '3',
                name: 'Offer Letter',
                type: 'offer',
                subject: 'Job Offer - {{position}}',
                body: 'We are delighted to offer you the position of {{position}}...',
            },
        ];
    }
}

