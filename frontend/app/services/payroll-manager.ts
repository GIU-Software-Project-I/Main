import api, { ApiResponse } from './api';

// Payroll Manager Service - handles dispute and claim confirmations

export interface DisputeConfirmation {
  id: string;
  employeeName: string;
  employeeNumber: string;
  description: string;
  amount?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending payroll Manager approval' | 'approved' | 'rejected';
  specialistName: string;
  specialistNotes?: string;
  managerNotes?: string;
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
  status: 'pending payroll Manager approval' | 'approved' | 'rejected';
  specialistName: string;
  specialistNotes?: string;
  managerNotes?: string;
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
    const res = await api.get<DisputeConfirmation[]>('/payroll/tracking/disputes/approved');
    // backend returns an array for this endpoint; normalize just in case
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }

  async getConfirmedClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll/tracking/claims/approved');
  }

  async getUnderReviewDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    return api.get<DisputeConfirmation[]>('/payroll-manager/disputes/under-review');
  }

  async getUnderReviewClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll-manager/claims/under-review');
  }

  async getAllClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    // backend accepts GET /payroll/tracking/claims with optional ?status=...; omit status to get all
    const res = await api.get<ClaimConfirmation[]>('/payroll/tracking/claims');
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }

  async getAllDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    // backend accepts GET /payroll/tracking/disputes with optional ?status=...; omit status to get all
    const res = await api.get<DisputeConfirmation[]>('/payroll/tracking/disputes');
    // backend `getAllDisputes` returns a wrapper { success, data, count }
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }

  // Client-side helpers to fetch rejected items without backend changes
  async getRejectedClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    const res = await api.get<ClaimConfirmation[]>('/payroll/tracking/claims?status=rejected');
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }

  async getRejectedDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    const res = await api.get<DisputeConfirmation[]>('/payroll/tracking/disputes?status=rejected');
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }
}

export const payrollManagerService = new PayrollManagerService();
