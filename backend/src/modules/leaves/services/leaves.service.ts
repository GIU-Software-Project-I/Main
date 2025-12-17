import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaveTypeDocument } from '../models/leave-type.schema';
import { LeaveCategoryDocument } from '../models/leave-category.schema';
import { LeaveRequestDocument } from '../models/leave-request.schema';
import { LeaveEntitlementDocument } from '../models/leave-entitlement.schema';
import { LeaveAdjustmentDocument } from '../models/leave-adjustment.schema';
import { CalendarDocument } from '../models/calendar.schema';
import { AttachmentDocument } from '../models/attachment.schema';
import { LeaveStatus } from '../enums/leave-status.enum';
import { AccrualMethod } from '../enums/accrual-method.enum';
import { RoundingRule } from '../enums/rounding-rule.enum';
import { LeavePolicyDocument } from '../models/leave-policy.schema';
import { SharedLeavesService } from '../../shared/services/shared-leaves.service';
import { AdjustmentType } from '../enums/adjustment-type.enum';

@Injectable()
export class UnifiedLeaveService {
  private readonly logger = new Logger(UnifiedLeaveService.name);

  constructor(
    @InjectModel('LeaveType')
    private leaveTypeModel: Model<LeaveTypeDocument>,
    @InjectModel('LeaveRequest')
    private leaveRequestModel: Model<LeaveRequestDocument>,
    @InjectModel('LeaveEntitlement')
    private entitlementModel: Model<LeaveEntitlementDocument>,
    @InjectModel('LeaveAdjustment')
    private adjustmentModel: Model<LeaveAdjustmentDocument>,
    @InjectModel('Calendar')
    private calendarModel: Model<CalendarDocument>,
    @InjectModel('Attachment')
    private attachmentModel: Model<AttachmentDocument>,
    @InjectModel('LeaveCategory')
    private leaveCategoryModel: Model<LeaveCategoryDocument>,
    @InjectModel('LeavePolicy')
    private policyModel: Model<LeavePolicyDocument>,
    private readonly sharedLeavesService: SharedLeavesService,
  ) { }

  private validateObjectId(id: string, fieldName: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
    }
  }

  // --------------------------------------------------------------------------------
  // Policy / Types / Categories
  // --------------------------------------------------------------------------------

  // REQ-011: Track sick leave usage over last N years (default 3)
  async getLeaveUsageLastYears(
    employeeId: string,
    leaveTypeId: string,
    years: number = 3,
  ) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - years);

    const [agg] = await this.leaveRequestModel.aggregate([
      {
        $match: {
          employeeId: new Types.ObjectId(employeeId),
          leaveTypeId: new Types.ObjectId(leaveTypeId),
          status: LeaveStatus.APPROVED,
          'dates.from': { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$durationDays' },
        },
      },
    ]);

    const totalDays = agg?.totalDays ?? 0;
    const maxAllowed = 360;

    return {
      employeeId,
      leaveTypeId,
      periodStart: start,
      periodEnd: end,
      totalDays,
      maxAllowed,
      remainingAllowed: Math.max(0, maxAllowed - totalDays),
    };
  }

  // REQ-011: count how many times an employee took a specific leave
  async getLeaveCountForType(employeeId: string, leaveTypeId: string) {
    const count = await this.leaveRequestModel.countDocuments({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
      status: LeaveStatus.APPROVED,
    });

    return { employeeId, leaveTypeId, count };
  }

  // REQ-006 Create and Manage Leave Types
  async createLeaveType(dto: any) {
    const exists = await this.leaveTypeModel.findOne({ code: dto.code });
    if (exists) throw new ConflictException('Leave type code already exists');
    return new this.leaveTypeModel(dto).save();
  }

  async getAllLeaveTypes() {
    return this.leaveTypeModel.find().lean();
  }

  async getLeaveType(id: string) {
    const doc = await this.leaveTypeModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Leave type not found');
    return doc;
  }

  async updateLeaveType(id: string, dto: any) {
    const updated = await this.leaveTypeModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!updated) throw new NotFoundException('Leave type not found');
    return updated;
  }

  async deleteLeaveType(id: string) {
    const deleted = await this.leaveTypeModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Leave type not found');
    return { success: true };
  }

  // REQ-010, REQ-011 Categories
  async createCategory(dto: any) {
    return this.leaveCategoryModel.create(dto);
  }

  async getAllCategories() {
    return this.leaveCategoryModel.find().lean();
  }

  async getCategory(id: string) {
    return this.leaveCategoryModel.findById(id).lean();
  }

  async updateCategory(id: string, dto: any) {
    return this.leaveCategoryModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
  }

  async deleteCategory(id: string) {
    const deleted = await this.leaveCategoryModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Category not found');
    return { success: true };
  }

  // --------------------------------------------------------------------------------
  // Eligibility rules (REQ-007)
  // --------------------------------------------------------------------------------

  async checkEligibility(employeeProfile: any, leaveTypeId: string) {
    const leaveType = (await this.leaveTypeModel
      .findById(leaveTypeId)
      .lean()) as any;
    if (!leaveType) throw new BadRequestException('Invalid leave type');

    if (leaveType.eligibility?.minTenureDays) {
      const hireDate = new Date(employeeProfile.hireDate);
      const days = Math.floor(
        (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days < leaveType.eligibility.minTenureDays) {
        return { ok: false, reason: 'Minimum tenure not met' };
      }
    }

    if (
      leaveType.eligibility?.employmentTypes &&
      leaveType.eligibility.employmentTypes.length
    ) {
      if (
        !leaveType.eligibility.employmentTypes.includes(
          employeeProfile.employmentType,
        )
      ) {
        return { ok: false, reason: 'Employment type not eligible' };
      }
    }

    return { ok: true };
  }

  // --------------------------------------------------------------------------------
  // Calendar helpers (REQ-010)
  // --------------------------------------------------------------------------------

  async addHoliday(year: number, date: Date, reason?: string) {
    let doc = await this.calendarModel.findOne({ year });
    if (!doc)
      doc = await this.calendarModel.create({
        year,
        holidays: [],
        blockedPeriods: [],
      });
    doc.holidays.push(date);
    return doc.save();
  }

  async addBlockedPeriod(year: number, from: Date, to: Date, reason: string) {
    let doc = await this.calendarModel.findOne({ year });
    if (!doc)
      doc = await this.calendarModel.create({
        year,
        holidays: [],
        blockedPeriods: [],
      });
    doc.blockedPeriods.push({ from, to, reason });
    return doc.save();
  }

  async getCalendar(year: number) {
    return this.calendarModel.findOne({ year }).lean();
  }

  private async isHoliday(date: Date): Promise<boolean> {
    const year = date.getFullYear();
    const doc = await this.calendarModel.findOne({ year }).lean();
    if (!doc) return false;

    return (doc.holidays || []).some(
      (d: any) => new Date(d).toDateString() === date.toDateString(),
    );
  }

  private async isBlockedPeriod(date: Date): Promise<boolean> {
    const year = date.getFullYear();
    const doc = await this.calendarModel.findOne({ year }).lean();
    if (!doc) return false;

    for (const p of doc.blockedPeriods || []) {
      const from = new Date(p.from);
      const to = new Date(p.to);
      if (date >= from && date <= to) return true;
    }
    return false;
  }

  // REQ-005 / REQ-010: working duration = exclude weekends + public holidays
  private async _calculateWorkingDuration(
    employeeId: string,
    from: Date,
    to: Date,
  ) {
    let count = 0;

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const day = new Date(d);

      const dayOfWeek = day.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) continue;

      const holiday = await this.isHoliday(day);
      if (holiday) continue;

      count++;
    }

    return count;
  }

  // --------------------------------------------------------------------------------
  // Leave Request lifecycle (REQ-015 .. REQ-031)
  // --------------------------------------------------------------------------------

  async createLeaveRequest(dto: {
    employeeId: string;
    leaveTypeId: string;
    from: Date;
    to: Date;
    justification?: string;
    attachmentId?: string;
    employeeProfile?: any;
    postLeave?: boolean;
  }) {
    if (!dto.employeeId || !dto.leaveTypeId || !dto.from || !dto.to) {
      throw new BadRequestException('Missing fields');
    }

    const leaveType = await this.leaveTypeModel
      .findById(dto.leaveTypeId)
      .lean();
    if (!leaveType) {
      throw new BadRequestException('Invalid leave type');
    }

    if (dto.employeeProfile) {
      const elig = await this.checkEligibility(
        dto.employeeProfile,
        dto.leaveTypeId,
      );
      if (!elig.ok) {
        throw new BadRequestException(`Ineligible: ${elig.reason}`);
      }
    }

    if (leaveType.requiresAttachment && !dto.attachmentId) {
      throw new BadRequestException(
        'Attachment is required for this leave type',
      );
    }

    if (dto.attachmentId) {
      const attachment = await this.attachmentModel
        .findById(dto.attachmentId)
        .lean();
      if (!attachment) {
        throw new BadRequestException('Attachment not found');
      }
    }

    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);

    if (dto.postLeave) {
      const MAX_POST_LEAVE_DAYS = 30;
      const now = new Date();
      const diffMs = now.getTime() - toDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > MAX_POST_LEAVE_DAYS) {
        throw new BadRequestException(
          `Post-leave requests must be submitted within ${MAX_POST_LEAVE_DAYS} days after leave end`,
        );
      }
    }

    // Check for overlaps with PENDING or APPROVED requests
    // REQ-015: System should automatically check for overlapping dates
    // Improved logic to cover [StartA, EndA] overlaps [StartB, EndB]
    const overlap = await this.leaveRequestModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        status: { $in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] }, // Covered pending too for safety
        $or: [
          { 'dates.from': { $lte: toDate }, 'dates.to': { $gte: fromDate } },
        ],
      })
      .lean();

    if (overlap) {
      throw new BadRequestException('Overlapping leave request exists (Pending or Approved)');
    }

    for (
      let d = new Date(fromDate);
      d <= toDate;
      d.setDate(d.getDate() + 1)
    ) {
      const day = new Date(d);
      if (await this.isBlockedPeriod(day)) {
        throw new BadRequestException(
          'Requested dates fall within a blocked period',
        );
      }
    }

    const duration = await this._calculateWorkingDuration(
      dto.employeeId,
      fromDate,
      toDate,
    );

    if (leaveType.maxDurationDays && duration > leaveType.maxDurationDays) {
      throw new BadRequestException(
        `Requested duration (${duration} days) exceeds the maximum allowed for this leave type (${leaveType.maxDurationDays} days)`,
      );
    }

    // REQ-028: Medical certificate for Sick leave > 1 day
    // We check category name or type code for "SICK"
    const category = await this.leaveCategoryModel.findById(leaveType.categoryId);
    const isSick = category?.name?.toLowerCase().includes('sick') || leaveType.name.toLowerCase().includes('sick');

    if (isSick && duration > 1 && !dto.attachmentId) {
      throw new BadRequestException('Medical certificate is required for sick leave exceeding 1 day');
    }

    // Entitlement Check
    if (leaveType.deductible) {
      const entitlement = await this.entitlementModel
        .findOne({
          employeeId: new Types.ObjectId(dto.employeeId),
          leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
        })
        .lean();

      // If deductible and NO entitlement record -> Assume 0 balance -> Fail if duration > 0
      if (!entitlement) {
        throw new BadRequestException('No leave entitlement found for this type. Balance is 0.');
      }

      const yearly = entitlement.yearlyEntitlement ?? 0;
      const carryForward = entitlement.carryForward ?? 0;
      const taken = entitlement.taken ?? 0;
      const pending = entitlement.pending ?? 0;
      const accrued = entitlement.accruedRounded ?? entitlement.accruedActual ?? yearly; // Use accrued if available, else yearly (depending on policy, but here we read state)
      // Note: In refined logic, remaining should be the source of truth if maintained correctly.

      const remaining = entitlement.remaining ?? (accrued + carryForward - taken - pending);

      if (duration > remaining) {
        throw new BadRequestException(
          `Requested duration (${duration} days) exceeds remaining entitlement (${remaining} days) for this leave type`,
        );
      }
    }

    const payload: any = {
      employeeId: new Types.ObjectId(dto.employeeId),
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
      dates: { from: fromDate, to: toDate },
      durationDays: duration,
      justification: dto.justification,
      attachmentId: dto.attachmentId
        ? new Types.ObjectId(dto.attachmentId)
        : undefined,
      approvalFlow: [
        { role: 'manager', status: 'pending' },
        { role: 'hr', status: 'pending' },
      ],
      status: LeaveStatus.PENDING,
      irregularPatternFlag: false,
      postLeave: !!dto.postLeave,
    };

    const created = new this.leaveRequestModel(payload);
    await created.save();

    // Update pending count in entitlement when request is created
    if (leaveType.deductible) {
      const ent = await this.entitlementModel.findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
      });
      if (ent) {
        ent.pending = (ent.pending || 0) + duration;
        await ent.save();
      }
    }

    const employeeProfile = await this.sharedLeavesService.getEmployeeProfile(dto.employeeId);
    const employeeName = employeeProfile?.fullName || 'Employee';
    await this.sharedLeavesService.sendLeaveRequestSubmittedNotification(
      dto.employeeId,
      employeeName,
      leaveType.name,
      fromDate,
      toDate
    );

    const managerId = await this.sharedLeavesService.getEmployeeManager(dto.employeeId);
    if (managerId) {
      await this.sharedLeavesService.sendManagerLeaveRequestNotification(
        managerId,
        employeeName,
        leaveType.name,
        fromDate,
        toDate
      );
    }

    return created;
  }

  async getAllRequests(
    opts: {
      page?: number;
      limit?: number;
      employeeId?: string;
      status?: string;
      leaveTypeId?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const q: any = {};

    if (opts.employeeId) q.employeeId = new Types.ObjectId(opts.employeeId);
    if (opts.status) q.status = opts.status;
    if (opts.leaveTypeId)
      q.leaveTypeId = new Types.ObjectId(opts.leaveTypeId);

    if (opts.from || opts.to) {
      q['dates.from'] = {};
      if (opts.from) q['dates.from'].$gte = new Date(opts.from);
      if (opts.to) q['dates.from'].$lte = new Date(opts.to);
    }

    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.max(1, Number(opts.limit) || 20);

    const [data, total] = await Promise.all([
      this.leaveRequestModel
        .find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.leaveRequestModel.countDocuments(q),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRequest(id: string) {
    return this.leaveRequestModel.findById(id).lean();
  }

  async updateRequest(id: string, dto: Partial<any>) {
    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be modified');
    }

    if (dto.from && dto.to) {
      const from = new Date(dto.from);
      const to = new Date(dto.to);

      const overlap = await this.leaveRequestModel
        .findOne({
          _id: { $ne: leave._id },
          employeeId: leave.employeeId,
          status: { $in: [LeaveStatus.APPROVED] },
          $or: [{ 'dates.from': { $lte: to }, 'dates.to': { $gte: from } }],
        })
        .lean();

      if (overlap) {
        throw new BadRequestException(
          'New dates overlap an approved leave',
        );
      }

      const duration = await this._calculateWorkingDuration(
        leave.employeeId.toString(),
        from,
        to,
      );

      const leaveType = await this.leaveTypeModel
        .findById(leave.leaveTypeId)
        .lean();
      if (!leaveType) {
        throw new BadRequestException('Invalid leave type for this request');
      }

      if (leaveType.maxDurationDays && duration > leaveType.maxDurationDays) {
        throw new BadRequestException(
          `Requested duration (${duration} days) exceeds the maximum allowed for this leave type (${leaveType.maxDurationDays} days)`,
        );
      }

      leave.dates = { from, to };
      leave.durationDays = duration;
    }

    if (dto.justification) {
      leave.justification = dto.justification;
    }
    if (dto.attachmentId) {
      leave.attachmentId = new Types.ObjectId(dto.attachmentId);
    }

    return leave.save();
  }

  async cancelRequest(id: string, employeeId: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(employeeId, 'employeeId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    if (leave.employeeId.toString() !== employeeId) {
      throw new BadRequestException('Unauthorized');
    }

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const leaveTypeName = leaveType?.name || 'Leave';

    if (leave.status === LeaveStatus.PENDING) {
      leave.status = LeaveStatus.CANCELLED;
      await leave.save();

      await this.sharedLeavesService.sendLeaveRequestCancelledNotification(
        employeeId,
        leaveTypeName,
        leave.dates.from,
        leave.dates.to
      );

      return leave;
    }

    if (leave.status === LeaveStatus.APPROVED) {
      leave.status = LeaveStatus.CANCELLED;
      await leave.save();

      const ent = await this.entitlementModel.findOne({
        employeeId: leave.employeeId,
        leaveTypeId: leave.leaveTypeId,
      });

      if (ent) {
        ent.taken = Math.max(0, (ent.taken || 0) - (leave.durationDays || 0));
        ent.remaining = (ent.remaining || 0) + (leave.durationDays || 0);
        await ent.save();
      }

      await this.syncCancellation(
        leave.employeeId.toString(),
        leave._id.toString(),
        leave.durationDays || 0,
      );

      await this.sharedLeavesService.sendLeaveRequestCancelledNotification(
        employeeId,
        leaveTypeName,
        leave.dates.from,
        leave.dates.to
      );

      await this.sharedLeavesService.syncLeaveWithTimeManagement(
        leave.employeeId.toString(),
        leave.dates.from,
        leave.dates.to,
        leaveTypeName,
        'cancelled'
      );

      return leave;
    }

    throw new BadRequestException('Request cannot be cancelled in current state');
  }

  async returnForCorrection(id: string, reviewerId: string, reason: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(reviewerId, 'reviewerId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be returned for correction');
    }

    leave.status = LeaveStatus.RETURNED_FOR_CORRECTION;

    // Add to approval flow history
    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    leave.approvalFlow.push({
      role: 'reviewer',
      status: 'returned_for_correction',
      decidedBy: new Types.ObjectId(reviewerId),
      decidedAt: new Date(),
      reason: reason,
    } as any);

    await leave.save();

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    await this.sharedLeavesService.sendLeaveRequestReturnedForCorrectionNotification(
      leave.employeeId.toString(),
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to,
      reason
    );

    return leave;
  }

  async resubmitCorrectedRequest(id: string, employeeId: string, corrections: Partial<{
    from: string;
    to: string;
    justification: string;
    attachmentId: string;
  }>) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(employeeId, 'employeeId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    if (leave.employeeId.toString() !== employeeId) {
      throw new BadRequestException('Unauthorized');
    }

    if (leave.status !== LeaveStatus.RETURNED_FOR_CORRECTION) {
      throw new BadRequestException('Only requests returned for correction can be resubmitted');
    }

    // Apply corrections
    if (corrections.from && corrections.to) {
      const from = new Date(corrections.from);
      const to = new Date(corrections.to);

      const duration = await this._calculateWorkingDuration(employeeId, from, to);
      leave.dates = { from, to };
      leave.durationDays = duration;
    }

    if (corrections.justification) {
      leave.justification = corrections.justification;
    }

    if (corrections.attachmentId) {
      leave.attachmentId = new Types.ObjectId(corrections.attachmentId);
    }

    // Reset status to pending
    leave.status = LeaveStatus.PENDING;

    // Reset approval flow
    leave.approvalFlow = [
      { role: 'manager', status: 'pending' },
      { role: 'hr', status: 'pending' },
    ] as any;

    await leave.save();

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const employeeProfile = await this.sharedLeavesService.getEmployeeProfile(employeeId);

    await this.sharedLeavesService.sendLeaveRequestSubmittedNotification(
      employeeId,
      employeeProfile?.fullName || 'Employee',
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to
    );

    return leave;
  }

  async managerApprove(id: string, managerId: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(managerId, 'managerId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Not found');

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Only pending requests can be approved by manager',
      );
    }

    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    leave.approvalFlow[0] = {
      role: 'manager',
      status: 'approved',
      decidedBy: new Types.ObjectId(managerId),
      decidedAt: new Date(),
    } as any;

    // Set status to APPROVED (manager approval is final)
    leave.status = LeaveStatus.APPROVED;

    // Update entitlement balance
    const ent = await this.entitlementModel.findOne({
      employeeId: leave.employeeId,
      leaveTypeId: leave.leaveTypeId,
    });

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const isDeductible = leaveType?.deductible ?? true;

    if (isDeductible && ent) {
      // Move from pending to taken
      const durationDays = leave.durationDays || 0;
      ent.pending = Math.max(0, (ent.pending || 0) - durationDays);
      ent.taken = (ent.taken || 0) + durationDays;

      // Calculate remaining properly: yearly + carryForward - taken
      const yearly = ent.yearlyEntitlement || 0;
      const carryForward = ent.carryForward || 0;
      ent.remaining = yearly + carryForward - ent.taken;

      await ent.save();
    }

    await leave.save();

    // Send approval notification to employee
    await this.sharedLeavesService.sendLeaveRequestApprovedNotification(
      leave.employeeId.toString(),
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to
    );

    return leave;
  }

  async managerReject(id: string, managerId: string, reason?: string) {
    this.validateObjectId(id, 'id');
    this.validateObjectId(managerId, 'managerId');

    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Not found');

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected by manager');
    }

    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    leave.approvalFlow[0] = {
      role: 'manager',
      status: 'rejected',
      decidedBy: new Types.ObjectId(managerId),
      decidedAt: new Date(),
      reason: reason,
    } as any;

    leave.status = LeaveStatus.REJECTED;
    await leave.save();

    // Update entitlement - remove from pending
    const ent = await this.entitlementModel.findOne({
      employeeId: leave.employeeId,
      leaveTypeId: leave.leaveTypeId,
    });

    if (ent) {
      ent.pending = Math.max(0, (ent.pending || 0) - (leave.durationDays || 0));
      await ent.save();
    }

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    await this.sharedLeavesService.sendLeaveRequestRejectedNotification(
      leave.employeeId.toString(),
      leaveType?.name || 'Leave',
      leave.dates.from,
      leave.dates.to,
      reason
    );

    return leave;
  }

  async hrFinalize(
    id: string,
    hrId: string,
    decision: 'approve' | 'reject',
    allowNegative: boolean = false,
    reason?: string,
  ) {
    const leave = await this.leaveRequestModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    // Allow override of REJECTED status if decision is approve
    // Also allow PENDING
    const validStatuses: LeaveStatus[] = [LeaveStatus.PENDING];
    if (decision === 'approve') {
      validStatuses.push(LeaveStatus.REJECTED); // Allow override
    }

    if (!validStatuses.includes(leave.status as LeaveStatus)) {
      throw new BadRequestException(
        `Cannot finalize request in status ${leave.status}`,
      );
    }

    if (!leave.approvalFlow || !Array.isArray(leave.approvalFlow)) {
      leave.approvalFlow = [] as any;
    }

    if (!leave.approvalFlow[1]) {
      leave.approvalFlow[1] = {
        role: 'hr',
        status: 'pending',
      } as any;
    }

    leave.approvalFlow[1] = {
      role: 'hr',
      status: decision === 'approve' ? 'approved' : 'rejected',
      decidedBy: new Types.ObjectId(hrId),
      decidedAt: new Date(),
    } as any;

    leave.status =
      decision === 'approve'
        ? LeaveStatus.APPROVED
        : LeaveStatus.REJECTED;

    if (decision === 'reject') {
      await leave.save();
      try {
        const leaveTypeForReject = await this.leaveTypeModel.findById(leave.leaveTypeId);
        await this.sharedLeavesService.sendLeaveRequestRejectedNotification(
          leave.employeeId.toString(),
          leaveTypeForReject?.name || 'Leave',
          leave.dates.from,
          leave.dates.to,
          reason
        );
      } catch (notifError) {
        this.logger.warn('Failed to send rejection notification:', notifError);
      }
      return leave;
    }

    const ent = await this.entitlementModel.findOne({
      employeeId: leave.employeeId,
      leaveTypeId: leave.leaveTypeId,
    });

    const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
    const isDeductible = leaveType?.deductible ?? true;

    if (isDeductible) {
      if (ent) {
        if (!allowNegative) {
          const remaining = ent.remaining ?? 0;
          if (leave.durationDays > remaining) {
            throw new BadRequestException(`Insufficient balance for approval. Request: ${leave.durationDays}, Remaining: ${remaining}. Use allowNegative=true to override.`);
          }
        }

        ent.taken = (ent.taken || 0) + (leave.durationDays || 0);
        ent.remaining = (ent.remaining || 0) - (leave.durationDays || 0);
        await ent.save();
      } else {
        // No entitlement exists
        if (!allowNegative) {
          throw new BadRequestException('No entitlement found. Cannot approve without allowNegative override.');
        }
        await this.entitlementModel.create({
          employeeId: leave.employeeId,
          leaveTypeId: leave.leaveTypeId,
          yearlyEntitlement: 0,
          accruedActual: 0,
          accruedRounded: 0,
          carryForward: 0,
          taken: leave.durationDays || 0,
          pending: 0,
          remaining: -(leave.durationDays || 0),
          lastAccrualDate: null,
          nextResetDate: null,
        });
      }
    }

    await this.payrollNotifyAfterApproval(leave);
    await leave.save();

    try {
      const leaveTypeForNotify = await this.leaveTypeModel.findById(leave.leaveTypeId);
      await this.sharedLeavesService.sendLeaveRequestApprovedNotification(
        leave.employeeId.toString(),
        leaveTypeForNotify?.name || 'Leave',
        leave.dates.from,
        leave.dates.to
      );

      await this.sharedLeavesService.syncLeaveWithTimeManagement(
        leave.employeeId.toString(),
        leave.dates.from,
        leave.dates.to,
        leaveTypeForNotify?.name || 'Leave',
        'approved'
      );
    } catch (notifError) {
      this.logger.warn('Failed to send approval notification or sync:', notifError);
    }

    return leave;
  }

  private async payrollNotifyAfterApproval(leave: LeaveRequestDocument) {
    try {
      const leaveType = await this.leaveTypeModel.findById(leave.leaveTypeId);
      await this.sharedLeavesService.syncLeaveWithPayroll(leave.employeeId.toString(), {
        leaveRequestId: leave._id.toString(),
        leaveTypeId: leave.leaveTypeId.toString(),
        durationDays: leave.durationDays,
        isPaid: leaveType?.paid !== false,
        from: leave.dates.from,
        to: leave.dates.to,
      });
    } catch (err) {
      this.logger.warn('Payroll sync failed for leave ' + leave._id);
    }
  }

  // --------------------------------------------------------------------------------
  // Entitlements & Adjustments (REQ-008, REQ-013)
  // --------------------------------------------------------------------------------

  async assignEntitlement(
    employeeId: string,
    leaveTypeId: string,
    yearlyEntitlement: number,
  ) {
    const filter = {
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
    };
    const update = {
      yearlyEntitlement,
      remaining: yearlyEntitlement,
      lastAccrualDate: new Date(),
    };
    return this.entitlementModel
      .findOneAndUpdate(filter, update, { upsert: true, new: true })
      .lean();
  }

  // no sessions: simple create + update
  async manualEntitlementAdjustment(
    employeeId: string,
    leaveTypeId: string,
    amount: number,
    type: 'add' | 'deduct',
    reason: string,
    hrUserId: string,
  ) {
    await this.adjustmentModel.create({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
      adjustmentType: type,
      amount,
      reason,
      hrUserId: new Types.ObjectId(hrUserId),
      createdAt: new Date(),
    });

    const incValue = type === 'add' ? amount : -amount;

    const updated = await this.entitlementModel.findOneAndUpdate(
      {
        employeeId: new Types.ObjectId(employeeId),
        leaveTypeId: new Types.ObjectId(leaveTypeId),
      },
      { $inc: { remaining: incValue } },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Entitlement not found for employee + leaveType');
    }

    const leaveType = await this.leaveTypeModel.findById(leaveTypeId);
    await this.sharedLeavesService.sendLeaveBalanceAdjustedNotification(
      employeeId,
      leaveType?.name || 'Leave',
      type,
      amount,
      reason
    );

    return updated;
  }

  async getEntitlements(employeeId: string) {
    this.validateObjectId(employeeId, 'employeeId');
    return this.entitlementModel.find({ employeeId: new Types.ObjectId(employeeId) }).lean();
  }

  async createEntitlement(dto: any) {
    this.validateObjectId(dto.employeeId, 'employeeId');
    this.validateObjectId(dto.leaveTypeId, 'leaveTypeId');

    const existing = await this.entitlementModel.findOne({
      employeeId: new Types.ObjectId(dto.employeeId),
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });

    if (existing) {
      throw new ConflictException('Entitlement already exists for this employee and leave type');
    }

    return this.entitlementModel.create({
      ...dto,
      employeeId: new Types.ObjectId(dto.employeeId),
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });
  }

  async createAdjustment(dto: any) {
    return this.manualEntitlementAdjustment(
      dto.employeeId,
      dto.leaveTypeId,
      dto.amount,
      dto.adjustmentType,
      dto.reason,
      dto.hrUserId,
    );
  }

  // --------------------------------------------------------------------------------
  // Balance views and history (REQ-031, REQ-032, REQ-033)
  // --------------------------------------------------------------------------------

  async getEmployeeBalances(employeeId: string) {
    if (!employeeId) throw new BadRequestException('employeeId required');

    let entitlements = await this.entitlementModel
      .find({ employeeId: new Types.ObjectId(employeeId) })
      .lean();

    // If employee has no entitlements, auto-create default entitlements for all leave types
    if (entitlements.length === 0) {
      const allLeaveTypes = await this.leaveTypeModel.find().lean();

      for (const leaveType of allLeaveTypes) {
        // Default entitlement values based on leave type
        let defaultEntitlement = 0;
        const typeName = (leaveType.name || '').toLowerCase();
        const typeCode = (leaveType.code || '').toLowerCase();

        if (typeName.includes('annual') || typeCode.includes('annual')) {
          defaultEntitlement = 21; // 21 days annual leave
        } else if (typeName.includes('sick') || typeCode.includes('sick')) {
          defaultEntitlement = 14; // 14 days sick leave
        } else if (typeName.includes('personal') || typeCode.includes('personal')) {
          defaultEntitlement = 5; // 5 days personal leave
        } else {
          defaultEntitlement = 5; // Default for other types
        }

        await this.entitlementModel.create({
          employeeId: new Types.ObjectId(employeeId),
          leaveTypeId: leaveType._id,
          yearlyEntitlement: defaultEntitlement,
          accruedActual: defaultEntitlement,
          accruedRounded: defaultEntitlement,
          carryForward: 0,
          taken: 0,
          pending: 0,
          remaining: defaultEntitlement,
          lastAccrualDate: new Date(),
        });
      }

      // Re-fetch entitlements after creation
      entitlements = await this.entitlementModel
        .find({ employeeId: new Types.ObjectId(employeeId) })
        .lean();
    }

    // Fetch all leave types to enrich the response
    const allLeaveTypes = await this.leaveTypeModel.find().lean();
    const leaveTypeMap = new Map(allLeaveTypes.map(lt => [lt._id.toString(), lt]));

    const results = await Promise.all(
      entitlements.map(async (ent: any) => {
        // Match both uppercase and lowercase status values for compatibility
        const takenAgg = await this.leaveRequestModel.aggregate([
          {
            $match: {
              employeeId: new Types.ObjectId(employeeId),
              leaveTypeId: new Types.ObjectId(ent.leaveTypeId),
              status: { $in: ['approved', 'APPROVED'] },
            },
          },
          { $group: { _id: null, takenDays: { $sum: '$durationDays' } } },
        ]);

        const pendingAgg = await this.leaveRequestModel.aggregate([
          {
            $match: {
              employeeId: new Types.ObjectId(employeeId),
              leaveTypeId: new Types.ObjectId(ent.leaveTypeId),
              status: { $in: ['pending', 'PENDING'] },
            },
          },
          { $group: { _id: null, pendingDays: { $sum: '$durationDays' } } },
        ]);

        const takenFromRequests = takenAgg[0]?.takenDays ?? 0;
        const pendingFromRequests = pendingAgg[0]?.pendingDays ?? 0;

        // Use aggregated values from actual requests for accuracy
        // This ensures we always have the correct count from approved/pending requests
        const taken = takenFromRequests;
        const pending = pendingFromRequests;
        const yearly = ent.yearlyEntitlement ?? 0;
        const carryForward = ent.carryForward ?? 0;

        // Always calculate remaining from source values: yearly + carryForward - taken
        // This ensures accuracy even if stored values are stale
        const remaining = yearly + carryForward - taken;

        // Get leave type info
        const leaveType = leaveTypeMap.get(ent.leaveTypeId.toString());

        return {
          leaveTypeId: ent.leaveTypeId,
          leaveTypeName: leaveType?.name || '',
          leaveTypeCode: leaveType?.code || '',
          yearlyEntitlement: yearly,
          accrued: yearly,
          taken,
          pending,
          carryForward,
          remaining,
          usedRounded: Math.round(taken),
          lastAccrualDate: ent.lastAccrualDate ?? null,
        };
      }),
    );

    return results;
  }

  async getEmployeeHistory(
    employeeId: string,
    opts: {
      leaveTypeId?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {},
  ) {
    if (!employeeId) throw new BadRequestException('employeeId required');

    const q: any = { employeeId: new Types.ObjectId(employeeId) };
    if (opts.leaveTypeId)
      q.leaveTypeId = new Types.ObjectId(opts.leaveTypeId);
    if (opts.status) q.status = opts.status;
    if (opts.from || opts.to) {
      q['dates.from'] = {};
      if (opts.from) q['dates.from'].$gte = new Date(opts.from);
      if (opts.to) q['dates.from'].$lte = new Date(opts.to);
    }

    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, opts.limit ?? 20);
    const sort = opts.sort ?? '-dates.from';

    const docs = await this.leaveRequestModel
      .find(q)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await this.leaveRequestModel.countDocuments(q);
    return { data: docs, page, limit, total };
  }

  async recalcEmployee(employeeId: string) {
    const entitlements = await this.entitlementModel.find({
      employeeId: new Types.ObjectId(employeeId),
    });
    for (const e of entitlements) {
      e.remaining =
        (e.yearlyEntitlement || 0) +
        (e.carryForward || 0) -
        (e.taken || 0);
      await e.save();
    }
    return { ok: true, processed: entitlements.length };
  }

  // --------------------------------------------------------------------------------
  // Manager views & admin filters (REQ-034, REQ-035, REQ-039)
  // --------------------------------------------------------------------------------

  async teamBalances(
    managerId: string,
    opts: { department?: string; leaveTypeId?: string } = {},
  ) {
    const employees = await this.leaveRequestModel
      .distinct('employeeId', {
        'approvalFlow.0.decidedBy': new Types.ObjectId(managerId),
      })
      .catch(() => []);

    if (!employees || employees.length === 0) return [];

    const result = await Promise.all(
      (employees as Types.ObjectId[]).map(async (empId: any) => {
        const balances = await this.getEmployeeBalances(empId.toString());
        return { employeeId: empId.toString(), balances };
      }),
    );
    return result;
  }

  async teamRequests(
    managerId: string,
    opts: {
      leaveTypeId?: string;
      status?: string;
      department?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {},
  ) {
    const q: any = {};
    if (opts.leaveTypeId)
      q.leaveTypeId = new Types.ObjectId(opts.leaveTypeId);
    if (opts.status) q.status = opts.status;
    if (opts.from || opts.to) {
      q['dates.from'] = {};
      if (opts.from) q['dates.from'].$gte = new Date(opts.from);
      if (opts.to) q['dates.from'].$lte = new Date(opts.to);
    }

    q['approvalFlow.0.decidedBy'] = new Types.ObjectId(managerId);

    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, opts.limit ?? 20);
    const sort = opts.sort ?? '-dates.from';

    const docs = await this.leaveRequestModel
      .find(q)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await this.leaveRequestModel.countDocuments(q);
    return { data: docs, page, limit, total };
  }

  async irregularPatterns(
    managerId: string,
    opts: { department?: string } = {},
  ) {
    const threshold = 3;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const docs = await this.leaveRequestModel.aggregate([
      {
        $match: {
          'dates.from': { $gte: sixMonthsAgo },
          leaveTypeCategory: 'Sick',
        },
      },
      { $group: { _id: '$employeeId', cnt: { $sum: 1 } } },
      { $match: { cnt: { $gte: threshold } } },
    ]);

    return docs;
  }

  // --------------------------------------------------------------------------------
  // Accruals & Carry-forward (REQ-003, REQ-040, REQ-041, REQ-042)
  // --------------------------------------------------------------------------------

  private applyRounding(value: number, mode: RoundingRule): number {
    if (mode === RoundingRule.NONE) return value;
    if (mode === RoundingRule.ROUND) return Math.round(value);
    if (mode === RoundingRule.ROUND_UP) return Math.ceil(value);
    if (mode === RoundingRule.ROUND_DOWN) return Math.floor(value);
    return value;
  }

  async runAccrual(
    referenceDate?: string,
    method: AccrualMethod = AccrualMethod.MONTHLY,
    roundingRule: RoundingRule = RoundingRule.ROUND,
  ) {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    let processedCount = 0;
    let createdCount = 0;

    // Get all leave types
    const allLeaveTypes = await this.leaveTypeModel.find().lean();

    if (allLeaveTypes.length === 0) {
      return {
        ok: false,
        message: 'No leave types found. Please create leave types first.',
        processed: 0,
        created: 0,
      };
    }

    // Get all unique employee IDs from existing entitlements and leave requests
    const entitlementEmployees = await this.entitlementModel.distinct('employeeId');
    const requestEmployees = await this.leaveRequestModel.distinct('employeeId');

    // Combine and deduplicate
    const allEmployeeIds = new Set([
      ...entitlementEmployees.map(id => id.toString()),
      ...requestEmployees.map(id => id.toString()),
    ]);

    this.logger.log(`Found ${allEmployeeIds.size} employees for accrual processing`);

    // Create missing entitlements for each employee
    for (const employeeIdStr of allEmployeeIds) {
      const employeeId = new Types.ObjectId(employeeIdStr);
      const existingEntitlements = await this.entitlementModel.find({ employeeId }).lean();
      const existingTypeIds = new Set(existingEntitlements.map(e => e.leaveTypeId?.toString()));

      for (const leaveType of allLeaveTypes) {
        if (existingTypeIds.has(leaveType._id.toString())) continue;

        // Determine default entitlement based on leave type
        let defaultEntitlement = 0;
        const typeName = (leaveType.name || '').toLowerCase();
        const typeCode = (leaveType.code || '').toLowerCase();

        if (typeName.includes('annual') || typeCode.includes('annual')) {
          defaultEntitlement = 21;
        } else if (typeName.includes('sick') || typeCode.includes('sick')) {
          defaultEntitlement = 21; // Sick leave days
        } else if (typeName.includes('personal') || typeCode.includes('personal')) {
          defaultEntitlement = 5;
        } else if (typeName.includes('paternity') || typeCode.includes('paternity')) {
          defaultEntitlement = 5;
        } else if (typeName.includes('maternity') || typeCode.includes('maternity')) {
          defaultEntitlement = 90;
        } else {
          defaultEntitlement = 5;
        }

        await this.entitlementModel.create({
          employeeId,
          leaveTypeId: leaveType._id,
          yearlyEntitlement: defaultEntitlement,
          accruedActual: 0,
          accruedRounded: 0,
          carryForward: 0,
          taken: 0,
          pending: 0,
          remaining: 0,
          lastAccrualDate: null,
        });
        createdCount++;
        this.logger.log(`Created entitlement for employee ${employeeIdStr}, type ${leaveType.name}`);
      }
    }

    // Now run the actual accrual on all entitlements
    const entitlements = await this.entitlementModel.find();
    this.logger.log(`Processing ${entitlements.length} entitlements for accrual`);

    for (const e of entitlements) {
      if (!e.yearlyEntitlement || e.yearlyEntitlement <= 0) {
        this.logger.log(`Skipping entitlement ${e._id} - no yearly entitlement`);
        continue;
      }

      let delta = 0;
      const yearly = e.yearlyEntitlement || 0;

      switch (method) {
        case AccrualMethod.MONTHLY:
          delta = yearly / 12;
          break;
        case AccrualMethod.YEARLY:
          delta = yearly;
          break;
        case AccrualMethod.PER_TERM:
          delta = yearly / 3;
          break;
        default:
          delta = yearly / 12;
      }

      // For first-time accrual or if method is YEARLY, just add the delta
      const lastAccrual = e.lastAccrualDate;

      // Skip if already accrued today (prevent duplicate runs)
      if (lastAccrual) {
        const lastDate = new Date(lastAccrual);
        const refDate = new Date(ref);
        if (lastDate.toDateString() === refDate.toDateString()) {
          this.logger.log(`Skipping entitlement ${e._id} - already accrued today`);
          continue;
        }
      }

      // Add the accrual
      const previousAccrued = e.accruedActual || 0;
      e.accruedActual = previousAccrued + delta;
      e.accruedRounded = this.applyRounding(e.accruedActual, roundingRule);

      // Recalculate taken and pending from actual requests for accuracy
      const takenAgg = await this.leaveRequestModel.aggregate([
        {
          $match: {
            employeeId: e.employeeId,
            leaveTypeId: e.leaveTypeId,
            status: { $in: ['approved', 'APPROVED'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$durationDays' } } },
      ]);

      const pendingAgg = await this.leaveRequestModel.aggregate([
        {
          $match: {
            employeeId: e.employeeId,
            leaveTypeId: e.leaveTypeId,
            status: { $in: ['pending', 'PENDING'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$durationDays' } } },
      ]);

      const taken = takenAgg[0]?.total ?? 0;
      const pending = pendingAgg[0]?.total ?? 0;
      const carryForward = e.carryForward || 0;

      e.taken = taken;
      e.pending = pending;
      e.remaining = e.accruedRounded + carryForward - taken - pending;
      e.lastAccrualDate = ref;

      await e.save();
      processedCount++;
      this.logger.log(`Accrued ${delta} days for entitlement ${e._id}. New accrued: ${e.accruedActual}, remaining: ${e.remaining}`);
    }

    return {
      ok: true,
      processed: processedCount,
      created: createdCount,
      totalEntitlements: entitlements.length,
      referenceDate: ref,
      method,
      roundingRule,
    };
  }

  /**
   * Year-End / Period Carry-Forward System
   * REQ: Automated carry-forward with caps, expiry rules, and audit logging
   *
   * Default rules per leave type:
   * - Annual Leave: Up to 10 days, expires after 6 months
   * - Sick Leave: Cannot be carried forward (resets)
   * - Personal/Paternity: Up to 5 days, expires after 3 months
   * - Other: Up to 5 days, expires after 6 months
   */
  async carryForward(
    referenceDate?: string,
    options?: {
      capDays?: number;
      expiryMonths?: number;
      leaveTypeRules?: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }>;
      dryRun?: boolean; // Preview changes without saving
    },
  ) {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const dryRun = options?.dryRun ?? false;

    // Get all leave types for rule mapping
    const leaveTypes = await this.leaveTypeModel.find().lean();
    const leaveTypeMap = new Map(leaveTypes.map(lt => [lt._id.toString(), lt]));

    // Define default carry-forward rules per leave type
    const defaultRules: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }> = {
      annual: { cap: 10, expiryMonths: 6, canCarryForward: true },
      sick: { cap: 0, expiryMonths: 0, canCarryForward: false },
      personal: { cap: 5, expiryMonths: 3, canCarryForward: true },
      paternity: { cap: 5, expiryMonths: 3, canCarryForward: true },
      maternity: { cap: 0, expiryMonths: 0, canCarryForward: false },
      unpaid: { cap: 0, expiryMonths: 0, canCarryForward: false },
      default: { cap: 5, expiryMonths: 6, canCarryForward: true },
    };

    // Merge with custom rules if provided
    const rules = { ...defaultRules, ...options?.leaveTypeRules };

    // Get rule for a leave type
    const getRuleForType = (leaveTypeId: string): { cap: number; expiryMonths: number; canCarryForward: boolean } => {
      const leaveType = leaveTypeMap.get(leaveTypeId);
      if (!leaveType) return rules.default;

      const name = (leaveType.name || '').toLowerCase();
      const code = (leaveType.code || '').toLowerCase();

      if (name.includes('annual') || code.includes('annual')) return rules.annual;
      if (name.includes('sick') || code.includes('sick')) return rules.sick;
      if (name.includes('personal') || code.includes('personal')) return rules.personal;
      if (name.includes('paternity') || code.includes('paternity')) return rules.paternity;
      if (name.includes('maternity') || code.includes('maternity')) return rules.maternity;
      if (name.includes('unpaid') || code.includes('unpaid')) return rules.unpaid;

      // Use global override if provided
      if (options?.capDays !== undefined) {
        return {
          cap: options.capDays,
          expiryMonths: options.expiryMonths ?? 6,
          canCarryForward: options.capDays > 0
        };
      }

      return rules.default;
    };

    const entitlements = await this.entitlementModel.find();
    const results: Array<{
      employeeId: string;
      leaveTypeId: string;
      leaveTypeName: string;
      previousRemaining: number;
      eligibleToCarry: number;
      cappedAmount: number;
      carriedForward: number;
      expired: number;
      expiryDate: Date | null;
      newBalance: number;
      rule: { cap: number; expiryMonths: number; canCarryForward: boolean };
    }> = [];

    let processedCount = 0;
    let totalCarriedForward = 0;
    let totalExpired = 0;

    for (const e of entitlements) {
      const leaveType = leaveTypeMap.get(e.leaveTypeId?.toString());
      const leaveTypeName = leaveType?.name || 'Unknown';
      const rule = getRuleForType(e.leaveTypeId?.toString() || '');

      // Calculate current remaining balance (unused days from previous year)
      const yearlyEntitlement = e.yearlyEntitlement || 0;
      const taken = e.taken || 0;
      const pending = e.pending || 0;
      const previousCarryForward = e.carryForward || 0;

      // Current remaining = what was entitled + carry forward - taken - pending
      const currentRemaining = Math.max(0, yearlyEntitlement + previousCarryForward - taken - pending);

      // Calculate carry-forward amount
      let eligibleToCarry = currentRemaining;
      let carriedForward = 0;
      let expired = 0;
      let expiryDate: Date | null = null;

      if (rule.canCarryForward && rule.cap > 0) {
        // Apply cap
        carriedForward = Math.min(eligibleToCarry, rule.cap);
        expired = Math.max(0, eligibleToCarry - carriedForward);

        // Calculate expiry date
        if (carriedForward > 0 && rule.expiryMonths > 0) {
          expiryDate = new Date(ref);
          expiryDate.setMonth(expiryDate.getMonth() + rule.expiryMonths);
        }
      } else {
        // Leave type cannot be carried forward - all unused expires
        expired = eligibleToCarry;
        carriedForward = 0;
      }

      // Calculate new balance for new year
      // New year starts with: new yearly entitlement + carried forward amount
      const newBalance = yearlyEntitlement + carriedForward;

      // Store result
      results.push({
        employeeId: e.employeeId?.toString() || '',
        leaveTypeId: e.leaveTypeId?.toString() || '',
        leaveTypeName,
        previousRemaining: currentRemaining,
        eligibleToCarry,
        cappedAmount: rule.cap,
        carriedForward,
        expired,
        expiryDate,
        newBalance,
        rule,
      });

      totalCarriedForward += carriedForward;
      totalExpired += expired;

      // Update entitlement if not dry run
      if (!dryRun) {
        e.carryForward = carriedForward;
        e.taken = 0; // Reset taken for new year
        e.pending = 0; // Reset pending count (actual pending requests remain)
        e.accruedActual = yearlyEntitlement;
        e.accruedRounded = yearlyEntitlement;
        e.remaining = newBalance;
        e.lastAccrualDate = ref;

        // Store expiry information
        (e as any).carryForwardExpiry = expiryDate;
        (e as any).carryForwardProcessedAt = ref;

        await e.save();
        processedCount++;

        this.logger.log(
          `Carry-forward for employee ${e.employeeId}, ${leaveTypeName}: ` +
          `${currentRemaining} remaining -> ${carriedForward} carried (cap: ${rule.cap}), ` +
          `${expired} expired, new balance: ${newBalance}`
        );
      }
    }

    // Group results by employee for reporting
    const employeeSummaries = new Map<string, {
      employeeId: string;
      totalCarried: number;
      totalExpired: number;
      details: typeof results;
    }>();

    for (const result of results) {
      const existing = employeeSummaries.get(result.employeeId);
      if (existing) {
        existing.totalCarried += result.carriedForward;
        existing.totalExpired += result.expired;
        existing.details.push(result);
      } else {
        employeeSummaries.set(result.employeeId, {
          employeeId: result.employeeId,
          totalCarried: result.carriedForward,
          totalExpired: result.expired,
          details: [result],
        });
      }
    }

    return {
      ok: true,
      dryRun,
      referenceDate: ref,
      processed: processedCount,
      totalEntitlements: entitlements.length,
      totalCarriedForward,
      totalExpired,
      rules: {
        annual: rules.annual,
        sick: rules.sick,
        personal: rules.personal,
        default: rules.default,
      },
      summary: {
        employeesProcessed: employeeSummaries.size,
        byLeaveType: leaveTypes.map(lt => {
          const typeResults = results.filter(r => r.leaveTypeId === lt._id.toString());
          return {
            leaveTypeId: lt._id.toString(),
            leaveTypeName: lt.name,
            totalCarried: typeResults.reduce((sum, r) => sum + r.carriedForward, 0),
            totalExpired: typeResults.reduce((sum, r) => sum + r.expired, 0),
            employeesAffected: typeResults.length,
          };
        }),
      },
      details: dryRun ? results : undefined, // Only include details for dry run
      auditLog: {
        action: dryRun ? 'CARRY_FORWARD_PREVIEW' : 'CARRY_FORWARD_EXECUTED',
        timestamp: new Date(),
        referenceDate: ref,
        totalProcessed: processedCount,
        totalCarriedForward,
        totalExpired,
      },
    };
  }

  /**
   * Get carry-forward preview without making changes
   */
  async previewCarryForward(
    referenceDate?: string,
    options?: {
      capDays?: number;
      expiryMonths?: number;
      leaveTypeRules?: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }>;
    },
  ) {
    return this.carryForward(referenceDate, { ...options, dryRun: true });
  }

  /**
   * Override carry-forward for specific employee
   */
  async overrideCarryForward(
    employeeId: string,
    leaveTypeId: string,
    carryForwardDays: number,
    expiryDate?: string,
    reason?: string,
  ) {
    const entitlement = await this.entitlementModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
    });

    if (!entitlement) {
      throw new NotFoundException('Entitlement not found');
    }

    const previousCarryForward = entitlement.carryForward || 0;
    const previousRemaining = entitlement.remaining || 0;

    // Update carry forward
    entitlement.carryForward = carryForwardDays;
    entitlement.remaining = (entitlement.yearlyEntitlement || 0) + carryForwardDays - (entitlement.taken || 0) - (entitlement.pending || 0);

    if (expiryDate) {
      (entitlement as any).carryForwardExpiry = new Date(expiryDate);
    }
    (entitlement as any).carryForwardOverrideReason = reason;
    (entitlement as any).carryForwardOverrideAt = new Date();

    await entitlement.save();

    this.logger.log(
      `Carry-forward override for employee ${employeeId}, type ${leaveTypeId}: ` +
      `${previousCarryForward} -> ${carryForwardDays} days. Reason: ${reason}`
    );

    return {
      ok: true,
      employeeId,
      leaveTypeId,
      previousCarryForward,
      newCarryForward: carryForwardDays,
      previousRemaining,
      newRemaining: entitlement.remaining,
      expiryDate: (entitlement as any).carryForwardExpiry,
      reason,
    };
  }

  /**
   * Get carry-forward report for all employees
   */
  async getCarryForwardReport(options?: {
    employeeId?: string;
    leaveTypeId?: string;
    year?: number;
  }) {
    const query: any = {};

    if (options?.employeeId) {
      query.employeeId = new Types.ObjectId(options.employeeId);
    }
    if (options?.leaveTypeId) {
      query.leaveTypeId = new Types.ObjectId(options.leaveTypeId);
    }

    const entitlements = await this.entitlementModel.find(query).lean();
    const leaveTypes = await this.leaveTypeModel.find().lean();
    const leaveTypeMap = new Map(leaveTypes.map(lt => [lt._id.toString(), lt]));

    const report = entitlements.map(e => {
      const leaveType = leaveTypeMap.get(e.leaveTypeId?.toString() || '');
      return {
        employeeId: e.employeeId?.toString(),
        leaveTypeId: e.leaveTypeId?.toString(),
        leaveTypeName: leaveType?.name || 'Unknown',
        yearlyEntitlement: e.yearlyEntitlement || 0,
        carryForward: e.carryForward || 0,
        carryForwardExpiry: (e as any).carryForwardExpiry,
        taken: e.taken || 0,
        pending: e.pending || 0,
        remaining: e.remaining || 0,
        lastAccrualDate: e.lastAccrualDate,
        overrideReason: (e as any).carryForwardOverrideReason,
      };
    });

    // Summary statistics
    const summary = {
      totalEmployees: new Set(report.map(r => r.employeeId)).size,
      totalCarryForward: report.reduce((sum, r) => sum + r.carryForward, 0),
      byLeaveType: leaveTypes.map(lt => {
        const typeEntitlements = report.filter(r => r.leaveTypeId === lt._id.toString());
        return {
          leaveTypeId: lt._id.toString(),
          leaveTypeName: lt.name,
          totalCarryForward: typeEntitlements.reduce((sum, r) => sum + r.carryForward, 0),
          employeesWithCarryForward: typeEntitlements.filter(r => r.carryForward > 0).length,
        };
      }),
    };

    return {
      ok: true,
      report,
      summary,
    };
  }

  async resetLeaveYear(
    strategy: 'hireDate' | 'calendarYear' | 'custom',
    referenceDate?: Date,
  ) {
    // REQ-012: Define Legal Leave Year & Reset Rules
    // Corrected to respect Accrual Method
    const entitlements = await this.entitlementModel.find();
    const policies = await this.policyModel.find().lean();
    const policyMap = new Map(policies.map(p => [p.leaveTypeId.toString(), p]));

    for (const e of entitlements) {
      const policy = policyMap.get(e.leaveTypeId.toString());
      const method = policy?.accrualMethod ?? AccrualMethod.YEARLY; // Default to yearly if no policy? Or Monthly? Safe choice.

      if (method === AccrualMethod.YEARLY) {
        // Yearly: Full entitlement upfront
        e.accruedActual = e.yearlyEntitlement || 0;
        e.accruedRounded = e.yearlyEntitlement || 0;
        e.remaining = (e.yearlyEntitlement || 0) + (e.carryForward || 0) - (e.taken || 0); // Logic assumes taken resets? No, taken is cumulative for the year usually. If this is RESET YEAR, taken should be 0? 
        // Wait, Reset Leave Year means "Start New Year".
        // Taken should be reset to 0.
        // Remaining = Accrued + CarryForward.
        // The previous code had " - e.taken". If taken is "Taken in PREVIOUS year", we shouldn't subtract it from NEW year balance.
        // We rely on "carryForward" calculation to have moved unused to carryForward.
        // So Remaining = Accrued (New) + CarryForward.
        e.taken = 0;
        e.pending = 0; // Assuming pending requests carry over? Or pending count reset? Usually pending requests are for valid dates. If dates in new year, they stay pending. But "count" in entitlement might differ.

        e.remaining = e.accruedRounded + e.carryForward;
      } else {
        // Monthly: Start with 0 accrued
        e.accruedActual = 0;
        e.accruedRounded = 0;
        e.remaining = (e.carryForward || 0); // Only start with CF
        e.taken = 0;
      }
      e.lastAccrualDate = referenceDate ?? new Date();
      await e.save();
    }
    return { ok: true, processed: entitlements.length };
  }

  async calculateServiceDays(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    if (!startDate || !endDate) return 0;
    const totalDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24),
    );

    const unpaidRequests = await this.leaveRequestModel
      .find({
        employeeId: new Types.ObjectId(employeeId),
        status: { $in: [LeaveStatus.APPROVED] },
        'dates.from': { $lte: endDate },
        'dates.to': { $gte: startDate },
      })
      .lean();

    let unpaidDays = 0;
    for (const period of unpaidRequests) {
      const overlapStart = new Date(
        Math.max(
          new Date(period.dates.from).getTime(),
          startDate.getTime(),
        ),
      );
      const overlapEnd = new Date(
        Math.min(
          new Date(period.dates.to).getTime(),
          endDate.getTime(),
        ),
      );
      if (overlapStart <= overlapEnd) {
        const days =
          Math.ceil(
            (overlapEnd.getTime() - overlapStart.getTime()) /
            (1000 * 60 * 60 * 24),
          ) + 1;
        unpaidDays += days;
      }
    }
    return Math.max(0, totalDays - unpaidDays);
  }

  // --------------------------------------------------------------------------------
  // Payroll integration (REQ-042)
  // --------------------------------------------------------------------------------

  async payrollSyncBalance(employeeId: string, balanceData?: any) {
    this.logger.log(
      `Payroll sync: Updating balances for employee ${employeeId}`,
    );
    return { ok: true, employeeId, syncedAt: new Date(), balanceData };
  }

  async payrollSyncLeave(
    employeeId: string,
    leaveData: {
      leaveRequestId: string;
      leaveTypeId: string;
      durationDays: number;
      isPaid: boolean;
      from: Date;
      to: Date;
    },
  ) {
    this.logger.log(
      `Payroll sync: Leave approved for ${employeeId}, duration: ${leaveData.durationDays} days`,
    );
    return {
      ok: true,
      employeeId,
      leaveRequestId: leaveData.leaveRequestId,
      syncedAt: new Date(),
    };
  }

  async calculateUnpaidDeduction(
    employeeId: string,
    baseSalary: number,
    workDaysInMonth: number,
    unpaidLeaveDays: number,
  ) {
    const dailyRate = baseSalary / workDaysInMonth;
    const deductionAmount = dailyRate * unpaidLeaveDays;
    return {
      deductionAmount: Math.round(deductionAmount * 100) / 100,
      formula: `(${baseSalary} / ${workDaysInMonth}) × ${unpaidLeaveDays}`,
    };
  }

  async calculateEncashment(
    employeeId: string,
    dailySalaryRate: number,
    unusedLeaveDays: number,
    maxEncashableDays = 30,
  ) {
    const daysEncashed = Math.min(unusedLeaveDays, maxEncashableDays);
    const encashmentAmount = dailySalaryRate * daysEncashed;
    return {
      encashmentAmount: Math.round(encashmentAmount * 100) / 100,
      daysEncashed,
      formula: `${dailySalaryRate} × ${daysEncashed}`,
    };
  }

  async syncCancellation(
    employeeId: string,
    leaveRequestId: string,
    daysToRestore: number,
  ) {
    this.logger.log(
      `Payroll sync: Leave cancelled for ${employeeId}, restoring ${daysToRestore} days`,
    );
    return {
      ok: true,
      employeeId,
      leaveRequestId,
      daysRestored: daysToRestore,
      syncedAt: new Date(),
    };
  }

  async payrollSyncLeaveWrapper(employeeId: string, leaveData: any) {
    return this.payrollSyncLeave(employeeId, leaveData);
  }

  // --------------------------------------------------------------------------------
  // Attachments (REQ-016, REQ-028)
  // --------------------------------------------------------------------------------

  async saveAttachment(dto: any) {
    return this.attachmentModel.create(dto);
  }

  async validateMedicalAttachment(id: string) {
    const attachment = await this.attachmentModel.findById(id);
    if (!attachment) throw new NotFoundException('Attachment not found');
    const type = (attachment.fileType || '').toLowerCase();
    if (!type.includes('pdf') && !type.includes('image')) {
      throw new BadRequestException('Invalid medical document');
    }
    return attachment;
  }

  // --------------------------------------------------------------------------------
  // Misc / Analytics / Bulk (REQ-027, REQ-039)
  // --------------------------------------------------------------------------------

  async bulkProcessRequests(
    requestIds: string[],
    action: 'approve' | 'reject',
    actorId: string,
  ) {
    const results: string[] = [];

    for (const id of requestIds) {
      const reqDoc = await this.leaveRequestModel.findById(id);
      if (!reqDoc) continue;

      if (!reqDoc.approvalFlow || !Array.isArray(reqDoc.approvalFlow)) {
        reqDoc.approvalFlow = [] as any;
      }

      if (action === 'approve') {
        reqDoc.approvalFlow[0] = {
          role: 'manager',
          status: 'approved',
          decidedBy: new Types.ObjectId(actorId),
          decidedAt: new Date(),
        } as any;
        reqDoc.status = LeaveStatus.PENDING;
      } else {
        reqDoc.approvalFlow[0] = {
          role: 'manager',
          status: 'rejected',
          decidedBy: new Types.ObjectId(actorId),
          decidedAt: new Date(),
        } as any;
        reqDoc.status = LeaveStatus.REJECTED;
      }

      await reqDoc.save();
      results.push(reqDoc._id.toString());
    }

    return { ok: true, processed: results.length, ids: results };
  }

  async flagIrregular(requestId: string, flag: boolean, reason?: string) {
    const leave = await this.leaveRequestModel.findById(requestId);
    if (!leave) throw new NotFoundException('Leave request not found');
    leave.irregularPatternFlag = !!flag;
    if (reason) {
      this.logger.log(
        `Irregular flag reason for ${requestId}: ${reason}`,
      );
    }
    return leave.save();
  }

  async calculateServiceDaysWrapper(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.calculateServiceDays(employeeId, startDate, endDate);
  }

  // --------------------------------------------------------------------------------
  // Leave Policies (REQ-003, REQ-009)
  // --------------------------------------------------------------------------------

  async createPolicy(dto: any) {
    this.validateObjectId(dto.leaveTypeId, 'leaveTypeId');

    const leaveType = await this.leaveTypeModel.findById(dto.leaveTypeId);
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    const existingPolicy = await this.policyModel.findOne({
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });

    if (existingPolicy) {
      throw new ConflictException('Policy already exists for this leave type');
    }

    return this.policyModel.create({
      ...dto,
      leaveTypeId: new Types.ObjectId(dto.leaveTypeId),
    });
  }

  async getAllPolicies() {
    return this.policyModel.find().populate('leaveTypeId', 'name code').lean();
  }

  async getPolicy(id: string) {
    this.validateObjectId(id, 'id');
    const policy = await this.policyModel.findById(id).populate('leaveTypeId', 'name code').lean();
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async getPolicyByLeaveType(leaveTypeId: string) {
    this.validateObjectId(leaveTypeId, 'leaveTypeId');
    const policy = await this.policyModel.findOne({
      leaveTypeId: new Types.ObjectId(leaveTypeId),
    }).populate('leaveTypeId', 'name code').lean();
    if (!policy) throw new NotFoundException('Policy not found for this leave type');
    return policy;
  }

  async updatePolicy(id: string, dto: any) {
    this.validateObjectId(id, 'id');
    const updated = await this.policyModel.findByIdAndUpdate(id, dto, { new: true }).lean();
    if (!updated) throw new NotFoundException('Policy not found');
    return updated;
  }

  async deletePolicy(id: string) {
    this.validateObjectId(id, 'id');
    const deleted = await this.policyModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Policy not found');
    return { success: true };
  }

  // --------------------------------------------------------------------------------
  // Statistics and Reports
  // --------------------------------------------------------------------------------

  async getLeaveStats(employeeId?: string, departmentId?: string) {
    const match: any = {};
    if (employeeId) match.employeeId = new Types.ObjectId(employeeId);

    const stats = await this.leaveRequestModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$durationDays' },
        },
      },
    ]);

    const result = {
      pending: { count: 0, totalDays: 0 },
      approved: { count: 0, totalDays: 0 },
      rejected: { count: 0, totalDays: 0 },
      cancelled: { count: 0, totalDays: 0 },
    };

    for (const s of stats) {
      if (s._id in result) {
        result[s._id] = { count: s.count, totalDays: s.totalDays };
      }
    }

    return result;
  }

  async getEntitlementSummary(employeeId: string) {
    this.validateObjectId(employeeId, 'employeeId');

    const entitlements = await this.entitlementModel
      .find({ employeeId: new Types.ObjectId(employeeId) })
      .populate('leaveTypeId', 'name code')
      .lean();

    return entitlements.map((ent: any) => ({
      leaveType: ent.leaveTypeId?.name || 'Unknown',
      leaveTypeCode: ent.leaveTypeId?.code || 'UNKNOWN',
      yearlyEntitlement: ent.yearlyEntitlement || 0,
      accrued: ent.accruedRounded || ent.accruedActual || 0,
      taken: ent.taken || 0,
      pending: ent.pending || 0,
      carryForward: ent.carryForward || 0,
      remaining: ent.remaining || 0,
    }));
  }

  async getPendingApprovalsCount(managerId: string) {
    this.validateObjectId(managerId, 'managerId');

    const count = await this.leaveRequestModel.countDocuments({
      status: LeaveStatus.PENDING,
      'approvalFlow.0.status': 'pending',
    });

    return { managerId, pendingCount: count };
  }

  async getOverdueRequests(hoursThreshold: number = 48) {
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    return this.leaveRequestModel.find({
      status: LeaveStatus.PENDING,
      createdAt: { $lt: thresholdDate },
    }).lean();
  }

  async checkAndEscalateOverdue() {
    const overdueRequests = await this.getOverdueRequests(48);

    for (const request of overdueRequests) {
      const employeeProfile = await this.sharedLeavesService.getEmployeeProfile(request.employeeId.toString());
      const managerId = await this.sharedLeavesService.getEmployeeManager(request.employeeId.toString());

      if (managerId) {
        await this.sharedLeavesService.sendOverdueApprovalEscalationNotification(
          managerId,
          request._id.toString(),
          employeeProfile?.fullName || 'Employee'
        );
      }
    }

    return { escalated: overdueRequests.length };
  }

  // --------------------------------------------------------------------------------
  // Calendar Management Extended
  // --------------------------------------------------------------------------------

  async updateCalendar(year: number, dto: { holidays?: Date[]; blockedPeriods?: any[] }) {
    let calendar = await this.calendarModel.findOne({ year });

    if (!calendar) {
      calendar = await this.calendarModel.create({
        year,
        holidays: dto.holidays || [],
        blockedPeriods: dto.blockedPeriods || [],
      });
    } else {
      if (dto.holidays) calendar.holidays = dto.holidays;
      if (dto.blockedPeriods) calendar.blockedPeriods = dto.blockedPeriods;
      await calendar.save();
    }

    return calendar;
  }

  async removeHoliday(year: number, date: Date) {
    const calendar = await this.calendarModel.findOne({ year });
    if (!calendar) throw new NotFoundException('Calendar not found for this year');

    const dateStr = date.toISOString().slice(0, 10);
    calendar.holidays = calendar.holidays.filter(
      (h: Date) => new Date(h).toISOString().slice(0, 10) !== dateStr
    );

    return calendar.save();
  }

  async removeBlockedPeriod(year: number, from: Date, to: Date) {
    const calendar = await this.calendarModel.findOne({ year });
    if (!calendar) throw new NotFoundException('Calendar not found for this year');

    calendar.blockedPeriods = calendar.blockedPeriods.filter(
      (p: any) =>
        new Date(p.from).getTime() !== from.getTime() ||
        new Date(p.to).getTime() !== to.getTime()
    );

    return calendar.save();
  }

  // --------------------------------------------------------------------------------
  // Attachment Management Extended
  // --------------------------------------------------------------------------------

  async getAttachment(id: string) {
    this.validateObjectId(id, 'id');
    const attachment = await this.attachmentModel.findById(id).lean();
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async deleteAttachment(id: string) {
    this.validateObjectId(id, 'id');
    const deleted = await this.attachmentModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Attachment not found');
    return { success: true };
  }

  // --------------------------------------------------------------------------------
  // Adjustment History
  // --------------------------------------------------------------------------------

  async getAdjustmentHistory(employeeId: string, leaveTypeId?: string) {
    this.validateObjectId(employeeId, 'employeeId');

    const filter: any = { employeeId: new Types.ObjectId(employeeId) };
    if (leaveTypeId) {
      this.validateObjectId(leaveTypeId, 'leaveTypeId');
      filter.leaveTypeId = new Types.ObjectId(leaveTypeId);
    }

    return this.adjustmentModel
      .find(filter)
      .populate('leaveTypeId', 'name code')
      .populate('hrUserId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }
}


