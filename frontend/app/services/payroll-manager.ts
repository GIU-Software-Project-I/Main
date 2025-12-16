import api, { ApiResponse } from './api';

// Payroll Manager Service - handles dispute and claim confirmations

export interface DisputeConfirmation {
  id: string;
  employeeName: string;
  employeeNumber: string;
  description: string;
  amount?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending_confirmation' | 'confirmed' | 'rejected_by_manager' | 'under review';
  specialistName: string;
  specialistNotes?: string;
  submittedAt: string;
  reviewedAt: string;
}

export interface ClaimConfirmation {
  id: string;
  employeeName: string;
  employeeNumber: string;
  claimType: string;
  description: string;
  amount: number;
  approvedAmount?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending_confirmation' | 'confirmed' | 'rejected_by_manager' | 'under review';
  specialistName: string;
  specialistNotes?: string;
  submittedAt: string;
  reviewedAt: string;
}

export interface DisputeConfirmationAction {
  disputeId: string;
  confirmed: boolean;
  notes?: string;
}

export interface ClaimConfirmationAction {
  claimId: string;
  confirmed: boolean;
  notes?: string;
}

class PayrollManagerService {
  async getPendingDisputeConfirmations(): Promise<ApiResponse<DisputeConfirmation[]>> {
    return api.get<DisputeConfirmation[]>('/payroll-manager/disputes/pending-confirmation');
  }

  async getPendingClaimConfirmations(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll-manager/claims/pending-confirmation');
  }

  async confirmDispute(action: DisputeConfirmationAction): Promise<ApiResponse<DisputeConfirmation>> {
    return api.put<DisputeConfirmation>('/payroll-manager/disputes/confirm', action);
  }

  async confirmClaim(action: ClaimConfirmationAction): Promise<ApiResponse<ClaimConfirmation>> {
    return api.put<ClaimConfirmation>('/payroll-manager/claims/confirm', action);
  }

  async getConfirmedDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    return api.get<DisputeConfirmation[]>('/payroll-manager/disputes/confirmed');
  }

  async getConfirmedClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll-manager/claims/confirmed');
  }

  async getUnderReviewDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    return api.get<DisputeConfirmation[]>('/payroll-manager/disputes/under-review');
  }

  async getUnderReviewClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll-manager/claims/under-review');
  }
}

export const payrollManagerService = new PayrollManagerService();
