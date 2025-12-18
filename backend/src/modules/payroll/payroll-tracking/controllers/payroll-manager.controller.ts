import { Controller, Get, Put, Body, HttpCode, HttpStatus, Req, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PayrollTrackingService } from '../services/payroll-tracking.service';
import { DisputeStatus, ClaimStatus } from '../enums/payroll-tracking-enum';
import type { Request } from 'express';
import { claims, claimsDocument } from '../models/claims.schema';
import { disputes, disputesDocument } from '../models/disputes.schema';
import { EmployeeProfile } from '../../../employee/models/employee/employee-profile.schema';
import { Public } from '../../../auth/decorators/public-decorator';

@Controller('payroll-manager')
export class PayrollManagerController {
  constructor(
    private readonly payrollTrackingService: PayrollTrackingService,
    @InjectModel(disputes.name) private readonly disputesModel: Model<disputesDocument>,
    @InjectModel(claims.name) private readonly claimsModel: Model<claimsDocument>,
    @InjectModel(EmployeeProfile.name) private readonly employeeModel: Model<EmployeeProfile>,
  ) {}

  // Test endpoint
  @Public()
  @Get('test')
  async test() {
    return { message: 'PayrollManagerController is working', timestamp: new Date().toISOString() };
  }

  // Get all disputes for manager (pending, approved, rejected)
  @Public()
  @Get('disputes/all')
  async getAllDisputes() {
    try {
      const allDisputes = await this.disputesModel
        .find({
          $or: [
            { status: DisputeStatus.PENDING_MANAGER_APPROVAL },
            { status: DisputeStatus.APPROVED },
            { status: DisputeStatus.REJECTED }
          ]
        })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payslipId', 'payPeriod netSalary')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      return allDisputes.map((d: any) => {
        const employee = (d.employeeId && typeof d.employeeId === 'object') ? d.employeeId : {};
        // Extract specialist and manager comments separately
        let specialistComment = '';
        let managerComment = '';
        const resolutionComment = d.resolutionComment || '';
        const rejectionReason = d.rejectionReason || '';
        
        // For rejected items, check if rejectionReason is from specialist or manager
        if (d.status === DisputeStatus.REJECTED) {
          // If there's no resolutionComment, it means specialist rejected it directly (never approved)
          // If there's a resolutionComment, it means specialist approved it first, then manager rejected it
          if (!resolutionComment || resolutionComment.trim() === '') {
            // Specialist rejected it directly - rejectionReason is specialist comment
            specialistComment = rejectionReason;
            managerComment = ''; // Manager didn't reject it
          } else {
            // Manager rejected it after specialist approved - rejectionReason is manager comment
            managerComment = rejectionReason;
            // Specialist comment is in resolutionComment (set when specialist approved it before manager rejected)
            specialistComment = resolutionComment;
          }
        } else if (resolutionComment.includes(' | Manager:')) {
          // If resolutionComment contains "| Manager:", split them - this is the new format
          const parts = resolutionComment.split(' | Manager:');
          specialistComment = parts[0].trim();
          managerComment = parts[1] ? parts[1].trim() : '';
        } else if (resolutionComment.toLowerCase().includes('confirmed by payroll manager') || 
                   resolutionComment.toLowerCase().startsWith('confirmed by payroll manager')) {
          // If it's a manager confirmation message without separator, it's manager comment only
          // This handles old data where manager confirmed without preserving specialist comment
          managerComment = resolutionComment;
          specialistComment = ''; // Specialist comment was not preserved in old data
        } else if (d.status === DisputeStatus.APPROVED && !resolutionComment.toLowerCase().includes('approved by payroll specialist')) {
          // If item is APPROVED and doesn't contain "Approved by Payroll Specialist", 
          // it means manager confirmed with custom note and no specialist comment was preserved
          managerComment = resolutionComment;
          specialistComment = '';
        } else if (resolutionComment.toLowerCase().includes('rejected by payroll manager')) {
          // Manager rejection in resolutionComment (shouldn't happen, but handle it)
          managerComment = resolutionComment;
          specialistComment = '';
        } else {
          // Otherwise, it's the specialist comment (for pending items or approved items where format is correct)
          // This includes "Approved by Payroll Specialist" or custom specialist comments
          specialistComment = resolutionComment;
          managerComment = '';
        }
        
        return {
          id: d._id?.toString() || String(d._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          description: d.description || 'No description',
          amount: (d as any).disputedAmount || (d as any).amount || 0,
          priority: (d as any).priority || 'medium',
          status: d.status || DisputeStatus.PENDING_MANAGER_APPROVAL,
          specialistName: 'Payroll Specialist',
          specialistNotes: specialistComment,
          managerNotes: managerComment,
          submittedAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching all disputes:', error);
      return [];
    }
  }

  // Get pending dispute confirmations
  @Public()
  @Get('disputes/pending-confirmation')
  async getPendingDisputeConfirmations() {
    try {
      const allDisputes = await this.disputesModel
        .find({ status: DisputeStatus.PENDING_MANAGER_APPROVAL })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payslipId', 'payPeriod netSalary')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      return allDisputes.map((d: any) => {
        const employee = (d.employeeId && typeof d.employeeId === 'object') ? d.employeeId : {};
        return {
          id: d._id?.toString() || String(d._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          description: d.description || 'No description',
          amount: (d as any).disputedAmount || (d as any).amount || 0,
          priority: (d as any).priority || 'medium',
          status: d.status || DisputeStatus.PENDING_MANAGER_APPROVAL,
          specialistName: 'Payroll Specialist',
          specialistNotes: d.resolutionComment || '',
          submittedAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching pending disputes:', error);
      return [];
    }
  }

  // Get under review disputes
  @Public()
  @Get('disputes/under-review')
  async getUnderReviewDisputes() {
    try {
      const allDisputes = await this.disputesModel
        .find({})
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payslipId', 'payPeriod netSalary')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      const disputesList = allDisputes.filter((d: any) => {
        const status = String(d.status || '').toLowerCase().trim();
        return status === 'under review' || 
               status === DisputeStatus.UNDER_REVIEW.toLowerCase() ||
               status === 'under_review';
      });
      
      return disputesList.map((d: any) => {
        const employee = (d.employeeId && typeof d.employeeId === 'object') ? d.employeeId : {};
        return {
          id: d._id?.toString() || String(d._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          description: d.description || 'No description',
          amount: (d as any).disputedAmount || (d as any).amount || 0,
          priority: (d as any).priority || 'medium',
          status: 'under review',
          specialistName: 'Payroll Specialist',
          specialistNotes: d.resolutionComment || '',
          submittedAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching under review disputes:', error);
      return [];
    }
  }

  // Get confirmed disputes
  @Public()
  @Get('disputes/confirmed')
  async getConfirmedDisputes() {
    try {
      const allDisputes = await this.disputesModel
        .find({})
        .populate('employeeId', 'firstName lastName employeeNumber')
        .populate('payslipId', 'payPeriod netSalary')
        .sort({ updatedAt: -1 })
        .lean()
        .exec();
      
      const disputesList = allDisputes.filter((d: any) => {
        const status = String(d.status || '').toLowerCase().trim();
        const isApproved = status === 'approved' || status === DisputeStatus.APPROVED.toLowerCase();
        if (!isApproved) return false;
        const comment = String(d.resolutionComment || '').toLowerCase();
        return comment.includes('confirmed by payroll manager');
      });
      
      return disputesList.map((d: any) => {
        const employee = (d.employeeId && typeof d.employeeId === 'object') ? d.employeeId : {};
        // Extract specialist and manager comments separately
        let specialistComment = '';
        let managerComment = '';
        const resolutionComment = d.resolutionComment || '';
        
        if (resolutionComment.includes(' | Manager:')) {
          // If resolutionComment contains "| Manager:", split them - this is the new format
          const parts = resolutionComment.split(' | Manager:');
          specialistComment = parts[0].trim();
          managerComment = parts[1] ? parts[1].trim() : '';
        } else if (resolutionComment.toLowerCase().includes('confirmed by payroll manager') || 
                   resolutionComment.toLowerCase().startsWith('confirmed by payroll manager')) {
          // If it's a manager confirmation message without separator, it's manager comment only
          // This handles old data where manager confirmed without preserving specialist comment
          managerComment = resolutionComment;
          specialistComment = ''; // Specialist comment was not preserved in old data
        } else if (d.status === DisputeStatus.APPROVED && !resolutionComment.toLowerCase().includes('approved by payroll specialist')) {
          // If item is APPROVED and doesn't contain "Approved by Payroll Specialist", 
          // it means manager confirmed with custom note and no specialist comment was preserved
          managerComment = resolutionComment;
          specialistComment = '';
        } else if (resolutionComment.toLowerCase().includes('rejected by payroll manager')) {
          // Manager rejection in resolutionComment (shouldn't happen, but handle it)
          managerComment = resolutionComment;
          specialistComment = '';
        } else {
          // Otherwise, it's the specialist comment
          // This includes "Approved by Payroll Specialist" or custom specialist comments
          specialistComment = resolutionComment;
          managerComment = '';
        }
        
        return {
          id: d._id?.toString() || String(d._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          description: d.description || 'No description',
          amount: (d as any).disputedAmount || (d as any).amount || 0,
          priority: (d as any).priority || 'medium',
          status: 'confirmed',
          specialistName: 'Payroll Specialist',
          specialistNotes: specialistComment,
          managerNotes: managerComment,
          submittedAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching confirmed disputes:', error);
      return [];
    }
  }

  // Confirm or reject dispute
  @Public()
  @Put('disputes/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmDispute(
    @Body() body: { disputeId: string; confirmed: boolean; notes?: string },
    @Req() req: Request
  ) {
    try {
      const { disputeId, confirmed, notes } = body;
      if (!disputeId) {
        throw new HttpException('Dispute ID is required', HttpStatus.BAD_REQUEST);
      }
      
      const action = confirmed ? 'confirm' : 'reject';
      const managerId = (req as any).user?.sub || (req as any).user?.id || 'system';
      
      const result = await this.payrollTrackingService.confirmDisputeApproval(
        disputeId,
        managerId,
        action,
        notes
      );

      const employee = (result as any).employeeId || {};
      // Extract specialist and manager comments separately
      let specialistComment = '';
      let managerComment = '';
      const resolutionComment = (result as any).resolutionComment || '';
      
      // For rejected items, check if rejectionReason is from specialist or manager
      if (!confirmed && (result as any).rejectionReason) {
        const rejectionReason = (result as any).rejectionReason || '';
        // If there's no resolutionComment, it means specialist rejected it directly (never approved)
        // If there's a resolutionComment, it means specialist approved it first, then manager rejected it
        if (!resolutionComment || resolutionComment.trim() === '') {
          // Specialist rejected it directly - rejectionReason is specialist comment
          specialistComment = rejectionReason;
          managerComment = ''; // Manager didn't reject it
        } else {
          // Manager rejected it after specialist approved - rejectionReason is manager comment
          managerComment = rejectionReason;
          // Specialist comment is in resolutionComment (set when specialist approved it before manager rejected)
          specialistComment = resolutionComment;
        }
      } else if (resolutionComment.includes(' | Manager:')) {
        // If resolutionComment contains "| Manager:", split them
        const parts = resolutionComment.split(' | Manager:');
        specialistComment = parts[0].trim();
        managerComment = parts[1] ? parts[1].trim() : '';
      } else if (resolutionComment.toLowerCase().includes('confirmed by payroll manager') || 
                 resolutionComment.toLowerCase().includes('rejected by payroll manager')) {
        // If it's a manager confirmation/rejection message without separator, it's manager comment only
        managerComment = resolutionComment;
        specialistComment = ''; // No specialist comment preserved
      } else {
        // Otherwise, it's the specialist comment
        specialistComment = resolutionComment;
        managerComment = '';
      }
      
      return {
        id: (result as any)._id?.toString() || disputeId,
        employeeName: employee.firstName && employee.lastName 
          ? `${employee.firstName} ${employee.lastName}` 
          : 'Unknown',
        employeeNumber: employee.employeeNumber || employee.employeeId || 'N/A',
        description: (result as any).description || (result as any).disputeReason || 'No description',
        amount: (result as any).disputedAmount || (result as any).amount || 0,
        priority: (result as any).priority || 'medium',
        status: (result as any).status || (confirmed ? 'approved' : 'rejected'),
        specialistName: 'Payroll Specialist',
        specialistNotes: specialistComment,
        managerNotes: managerComment,
        submittedAt: (result as any).createdAt ? new Date((result as any).createdAt).toISOString() : new Date().toISOString(),
        reviewedAt: (result as any).updatedAt ? new Date((result as any).updatedAt).toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error('[PayrollManager] Error confirming dispute:', error);
      throw new HttpException(
        error instanceof HttpException ? error.message : 'Failed to confirm dispute',
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get all claims for manager (pending, approved, rejected)
  @Public()
  @Get('claims/all')
  async getAllClaims() {
    try {
      const allClaims = await this.claimsModel
        .find({
          $or: [
            { status: ClaimStatus.PENDING_MANAGER_APPROVAL },
            { status: ClaimStatus.APPROVED },
            { status: ClaimStatus.REJECTED }
          ]
        })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      return allClaims.map((c: any) => {
        const employee = (c.employeeId && typeof c.employeeId === 'object') ? c.employeeId : {};
        // Extract specialist and manager comments separately
        let specialistComment = '';
        let managerComment = '';
        const resolutionComment = c.resolutionComment || '';
        const rejectionReason = c.rejectionReason || '';
        
        // For rejected items, check if rejectionReason is from specialist or manager
        if (c.status === ClaimStatus.REJECTED) {
          // Check if rejectionReason contains "Rejected by Payroll Specialist" - if so, it's specialist comment
          if (rejectionReason.toLowerCase().includes('rejected by payroll specialist')) {
            // Specialist rejected it - rejectionReason is specialist comment
            specialistComment = rejectionReason;
            managerComment = ''; // Manager didn't reject it
          } else {
            // Manager rejected it - rejectionReason is manager comment
            managerComment = rejectionReason;
            // Specialist comment is in resolutionComment (set when specialist approved it before manager rejected)
            specialistComment = resolutionComment;
          }
        } else if (resolutionComment.includes(' | Manager:')) {
          // If resolutionComment contains "| Manager:", split them - this is the new format
          const parts = resolutionComment.split(' | Manager:');
          specialistComment = parts[0].trim();
          managerComment = parts[1] ? parts[1].trim() : '';
        } else if (resolutionComment.toLowerCase().includes('confirmed by payroll manager') || 
                   resolutionComment.toLowerCase().startsWith('confirmed by payroll manager')) {
          // If it's a manager confirmation message without separator, it's manager comment only
          // This handles old data where manager confirmed without preserving specialist comment
          managerComment = resolutionComment;
          specialistComment = ''; // Specialist comment was not preserved in old data
        } else if (c.status === ClaimStatus.APPROVED && !resolutionComment.toLowerCase().includes('approved by payroll specialist')) {
          // If item is APPROVED and doesn't contain "Approved by Payroll Specialist", 
          // it means manager confirmed with custom note and no specialist comment was preserved
          managerComment = resolutionComment;
          specialistComment = '';
        } else if (resolutionComment.toLowerCase().includes('rejected by payroll manager')) {
          // Manager rejection in resolutionComment (shouldn't happen, but handle it)
          managerComment = resolutionComment;
          specialistComment = '';
        } else {
          // Otherwise, it's the specialist comment (for pending items or approved items where format is correct)
          // This includes "Approved by Payroll Specialist" or custom specialist comments
          specialistComment = resolutionComment;
          managerComment = '';
        }
        
        return {
          id: c._id?.toString() || String(c._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          claimType: c.claimType || 'Expense',
          description: c.description || 'No description',
          amount: c.amount || 0,
          approvedAmount: c.approvedAmount || c.amount || 0,
          priority: (c as any).priority || 'medium',
          status: c.status || ClaimStatus.PENDING_MANAGER_APPROVAL,
          specialistName: 'Payroll Specialist',
          specialistNotes: specialistComment,
          managerNotes: managerComment,
          submittedAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching all claims:', error);
      return [];
    }
  }

  // Get pending claim confirmations
  @Public()
  @Get('claims/pending-confirmation')
  async getPendingClaimConfirmations() {
    try {
      const allClaims = await this.claimsModel
        .find({ status: ClaimStatus.PENDING_MANAGER_APPROVAL })
        .populate('employeeId', 'firstName lastName employeeNumber')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      return allClaims.map((c: any) => {
        const employee = (c.employeeId && typeof c.employeeId === 'object') ? c.employeeId : {};
        return {
          id: c._id?.toString() || String(c._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          claimType: c.claimType || 'Expense',
          description: c.description || 'No description',
          amount: c.amount || 0,
          approvedAmount: c.approvedAmount || c.amount || 0,
          priority: (c as any).priority || 'medium',
          status: c.status || ClaimStatus.PENDING_MANAGER_APPROVAL,
          specialistName: 'Payroll Specialist',
          specialistNotes: c.resolutionComment || '',
          submittedAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching pending claims:', error);
      return [];
    }
  }

  // Get under review claims
  @Public()
  @Get('claims/under-review')
  async getUnderReviewClaims() {
    try {
      const allClaims = await this.claimsModel
        .find({})
        .populate('employeeId', 'firstName lastName employeeNumber')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      const claimsList = allClaims.filter((c: any) => {
        const status = String(c.status || '').toLowerCase().trim();
        return status === 'under review' || 
               status === ClaimStatus.UNDER_REVIEW.toLowerCase() ||
               status === 'under_review';
      });
      
      return claimsList.map((c: any) => {
        const employee = (c.employeeId && typeof c.employeeId === 'object') ? c.employeeId : {};
        return {
          id: c._id?.toString() || String(c._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          claimType: c.claimType || 'Expense',
          description: c.description || 'No description',
          amount: c.amount || 0,
          approvedAmount: c.approvedAmount || c.amount || 0,
          priority: (c as any).priority || 'medium',
          status: 'under review',
          specialistName: 'Payroll Specialist',
          specialistNotes: c.resolutionComment || '',
          submittedAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching under review claims:', error);
      return [];
    }
  }

  // Get confirmed claims
  @Public()
  @Get('claims/confirmed')
  async getConfirmedClaims() {
    try {
      const allClaims = await this.claimsModel
        .find({})
        .populate('employeeId', 'firstName lastName employeeNumber')
        .sort({ updatedAt: -1 })
        .lean()
        .exec();
      
      const claimsList = allClaims.filter((c: any) => {
        const status = String(c.status || '').toLowerCase().trim();
        const isApproved = status === 'approved' || status === ClaimStatus.APPROVED.toLowerCase();
        if (!isApproved) return false;
        const comment = String(c.resolutionComment || '').toLowerCase();
        return comment.includes('confirmed by payroll manager');
      });
      
      return claimsList.map((c: any) => {
        const employee = (c.employeeId && typeof c.employeeId === 'object') ? c.employeeId : {};
        // Extract specialist and manager comments separately
        let specialistComment = '';
        let managerComment = '';
        const resolutionComment = c.resolutionComment || '';
        
        if (resolutionComment.includes(' | Manager:')) {
          // If resolutionComment contains "| Manager:", split them - this is the new format
          const parts = resolutionComment.split(' | Manager:');
          specialistComment = parts[0].trim();
          managerComment = parts[1] ? parts[1].trim() : '';
        } else if (resolutionComment.toLowerCase().includes('confirmed by payroll manager') || 
                   resolutionComment.toLowerCase().startsWith('confirmed by payroll manager')) {
          // If it's a manager confirmation message without separator, it's manager comment only
          // This handles old data where manager confirmed without preserving specialist comment
          managerComment = resolutionComment;
          specialistComment = ''; // Specialist comment was not preserved in old data
        } else if (c.status === ClaimStatus.APPROVED && !resolutionComment.toLowerCase().includes('approved by payroll specialist')) {
          // If item is APPROVED and doesn't contain "Approved by Payroll Specialist", 
          // it means manager confirmed with custom note and no specialist comment was preserved
          managerComment = resolutionComment;
          specialistComment = '';
        } else if (resolutionComment.toLowerCase().includes('rejected by payroll manager')) {
          // Manager rejection in resolutionComment (shouldn't happen, but handle it)
          managerComment = resolutionComment;
          specialistComment = '';
        } else {
          // Otherwise, it's the specialist comment
          // This includes "Approved by Payroll Specialist" or custom specialist comments
          specialistComment = resolutionComment;
          managerComment = '';
        }
        
        return {
          id: c._id?.toString() || String(c._id) || 'unknown',
          employeeName: (employee.firstName && employee.lastName) 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown',
          employeeNumber: employee.employeeNumber || 'N/A',
          claimType: c.claimType || 'Expense',
          description: c.description || 'No description',
          amount: c.amount || 0,
          approvedAmount: c.approvedAmount || c.amount || 0,
          priority: (c as any).priority || 'medium',
          status: 'confirmed',
          specialistName: 'Payroll Specialist',
          specialistNotes: specialistComment,
          managerNotes: managerComment,
          submittedAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('[PayrollManager] Error fetching confirmed claims:', error);
      return [];
    }
  }

  // Confirm or reject claim
  @Public()
  @Put('claims/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmClaim(
    @Body() body: { claimId: string; confirmed: boolean; notes?: string },
    @Req() req: Request
  ) {
    try {
      const { claimId, confirmed, notes } = body;
      if (!claimId) {
        throw new HttpException('Claim ID is required', HttpStatus.BAD_REQUEST);
      }
      
      const action = confirmed ? 'confirm' : 'reject';
      const managerId = (req as any).user?.sub || (req as any).user?.id || 'system';
      
      const result = await this.payrollTrackingService.confirmClaimApproval(
        claimId,
        managerId,
        action,
        notes
      );

      const employee = (result as any).employeeId || {};
      // Extract specialist and manager comments separately
      let specialistComment = '';
      let managerComment = '';
      const resolutionComment = (result as any).resolutionComment || '';
      
      // For rejected items, check if rejectionReason is from specialist or manager
      if (!confirmed && (result as any).rejectionReason) {
        const rejectionReason = (result as any).rejectionReason || '';
        // If there's no resolutionComment, it means specialist rejected it directly (never approved)
        // If there's a resolutionComment, it means specialist approved it first, then manager rejected it
        if (!resolutionComment || resolutionComment.trim() === '') {
          // Specialist rejected it directly - rejectionReason is specialist comment
          specialistComment = rejectionReason;
          managerComment = ''; // Manager didn't reject it
        } else {
          // Manager rejected it after specialist approved - rejectionReason is manager comment
          managerComment = rejectionReason;
          // Specialist comment is in resolutionComment (set when specialist approved it before manager rejected)
          specialistComment = resolutionComment;
        }
      } else if (resolutionComment.includes(' | Manager:')) {
        // If resolutionComment contains "| Manager:", split them
        const parts = resolutionComment.split(' | Manager:');
        specialistComment = parts[0].trim();
        managerComment = parts[1] ? parts[1].trim() : '';
      } else if (resolutionComment.toLowerCase().includes('confirmed by payroll manager') || 
                 resolutionComment.toLowerCase().includes('rejected by payroll manager')) {
        // If it's a manager confirmation/rejection message without separator, it's manager comment only
        managerComment = resolutionComment;
        specialistComment = ''; // No specialist comment preserved
      } else {
        // Otherwise, it's the specialist comment
        specialistComment = resolutionComment;
        managerComment = '';
      }
      
      return {
        id: (result as any)._id?.toString() || claimId,
        employeeName: employee.firstName && employee.lastName 
          ? `${employee.firstName} ${employee.lastName}` 
          : 'Unknown',
        employeeNumber: employee.employeeNumber || employee.employeeId || 'N/A',
        claimType: (result as any).claimType || (result as any).type || 'Expense',
        description: (result as any).description || (result as any).reason || 'No description',
        amount: (result as any).amount || 0,
        approvedAmount: (result as any).approvedAmount || (result as any).amount || 0,
        priority: (result as any).priority || 'medium',
        status: (result as any).status || (confirmed ? 'approved' : 'rejected'),
        specialistName: 'Payroll Specialist',
        specialistNotes: specialistComment,
        managerNotes: managerComment,
        submittedAt: (result as any).createdAt ? new Date((result as any).createdAt).toISOString() : new Date().toISOString(),
        reviewedAt: (result as any).updatedAt ? new Date((result as any).updatedAt).toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error('[PayrollManager] Error confirming claim:', error);
      throw new HttpException(
        error instanceof HttpException ? error.message : 'Failed to confirm claim',
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
