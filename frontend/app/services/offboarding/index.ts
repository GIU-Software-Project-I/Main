'use client';

import apiService from '../api';

// Enums matching backend
export enum TerminationInitiation {
  EMPLOYEE = 'employee',
  HR = 'hr',
  MANAGER = 'manager',
}

export enum TerminationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ApprovalStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

// Interfaces matching backend schemas
export interface TerminationRequest {
  _id: string;
  employeeId: string;
  initiator: TerminationInitiation;
  reason: string;
  employeeComments?: string;
  hrComments?: string;
  status: TerminationStatus;
  terminationDate?: string;
  contractId: string;
  createdAt: string;
  updatedAt: string;
  performanceWarnings?: string[];
  performanceData?: {
    hasPublishedAppraisals: boolean;
    totalAppraisals: number;
    averageScore: number;
    lowScoreCount: number;
  };
}

export interface ClearanceItem {
  department: string;
  status: ApprovalStatus;
  comments?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface EquipmentItem {
  equipmentId?: string;
  name: string;
  returned: boolean;
  condition?: string;
}

export interface ClearanceChecklist {
  _id: string;
  terminationId: string;
  items: ClearanceItem[];
  equipmentList: EquipmentItem[];
  cardReturned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClearanceCompletionStatus {
  checklistId: string;
  allDepartmentsCleared: boolean;
  allEquipmentReturned: boolean;
  cardReturned: boolean;
  fullyCleared: boolean;
  pendingDepartments: string[];
  pendingEquipment: string[];
}

// DTOs for API calls
export interface CreateTerminationRequestDto {
  employeeId: string;
  contractId: string;
  initiator: TerminationInitiation;
  reason: string;
  employeeComments?: string;
  hrComments?: string;
  terminationDate?: string;
}

export interface CreateResignationRequestDto {
  employeeId: string;
  contractId: string;
  reason: string;
  employeeComments?: string;
  terminationDate?: string;
}

export interface UpdateTerminationStatusDto {
  status: TerminationStatus;
  hrComments?: string;
}

export interface CreateClearanceChecklistDto {
  terminationId: string;
  items?: Array<{
    department: string;
    comments?: string;
    updatedBy?: string;
  }>;
  equipmentList?: Array<{
    equipmentId?: string;
    name: string;
    returned: boolean;
    condition?: string;
  }>;
  cardReturned?: boolean;
}

export interface UpdateClearanceItemDto {
  department: string;
  status: ApprovalStatus;
  comments?: string;
  updatedBy: string;
  updatedAt?: string;
}

export interface UpdateEquipmentItemDto {
  equipmentId?: string;
  name: string;
  returned: boolean;
  condition?: string;
}

export interface RevokeAccessDto {
  employeeId: string;
}

export interface TriggerFinalSettlementDto {
  terminationId: string;
}

class OffboardingService {
  // OFF-001: Create termination request (HR Manager)
  async createTerminationRequest(dto: CreateTerminationRequestDto): Promise<TerminationRequest> {
    const response = await apiService.post<TerminationRequest>('/offboarding/termination-requests', dto);
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // Get all termination requests with optional filters
  async getAllTerminationRequests(
    employeeId?: string,
    status?: TerminationStatus,
    initiator?: TerminationInitiation
  ): Promise<TerminationRequest[]> {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    if (status) params.append('status', status);
    if (initiator) params.append('initiator', initiator);

    const queryString = params.toString();
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/termination-requests${queryString ? '?' + queryString : ''}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get termination requests by initiator type
  async getTerminationRequestsByInitiator(
    initiator: TerminationInitiation,
    status?: TerminationStatus
  ): Promise<TerminationRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/termination-requests/by-initiator/${initiator}${params}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get all resignation requests (employee-initiated)
  async getAllResignationRequests(status?: TerminationStatus): Promise<TerminationRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/resignation-requests/all${params}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get termination requests by status
  async getTerminationRequestsByStatus(status: TerminationStatus): Promise<TerminationRequest[]> {
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/termination-requests/by-status/${status}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get termination request by ID
  async getTerminationRequestById(id: string): Promise<TerminationRequest> {
    const response = await apiService.get<TerminationRequest>(`/offboarding/termination-requests/${id}`);
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // Update termination request status (workflow approval)
  async updateTerminationStatus(id: string, dto: UpdateTerminationStatusDto): Promise<TerminationRequest> {
    const response = await apiService.patch<TerminationRequest>(
      `/offboarding/termination-requests/${id}/status`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // Delete termination request (only if not approved)
  async deleteTerminationRequest(id: string): Promise<{ message: string; deletedId: string }> {
    const response = await apiService.delete<{ message: string; deletedId: string }>(
      `/offboarding/termination-requests/${id}`
    );
    if (response.error) throw new Error(response.error);
    return response.data as { message: string; deletedId: string };
  }

  // OFF-018: Create resignation request (Employee)
  async createResignationRequest(dto: CreateResignationRequestDto): Promise<TerminationRequest> {
    const response = await apiService.post<TerminationRequest>('/offboarding/resignation-requests', dto);
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // OFF-019: Get resignation requests by employee ID (Employee tracking)
  async getResignationRequestsByEmployeeId(employeeId: string): Promise<TerminationRequest[]> {
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/resignation-requests/employee/${employeeId}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // OFF-006: Create clearance checklist (HR Manager)
  async createClearanceChecklist(dto: CreateClearanceChecklistDto): Promise<ClearanceChecklist> {
    const response = await apiService.post<ClearanceChecklist>('/offboarding/clearance-checklists', dto);
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Get all clearance checklists
  async getAllClearanceChecklists(): Promise<ClearanceChecklist[]> {
    const response = await apiService.get<ClearanceChecklist[]>('/offboarding/clearance-checklists');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get clearance checklist by ID
  async getClearanceChecklistById(id: string): Promise<ClearanceChecklist> {
    const response = await apiService.get<ClearanceChecklist>(`/offboarding/clearance-checklists/${id}`);
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Get clearance checklist by termination ID
  async getClearanceChecklistByTerminationId(terminationId: string): Promise<ClearanceChecklist> {
    const response = await apiService.get<ClearanceChecklist>(
      `/offboarding/clearance-checklists/termination/${terminationId}`
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Get clearance completion status
  async getClearanceCompletionStatus(checklistId: string): Promise<ClearanceCompletionStatus> {
    const response = await apiService.get<ClearanceCompletionStatus>(
      `/offboarding/clearance-checklists/${checklistId}/status`
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceCompletionStatus;
  }

  // OFF-010: Update clearance item (department sign-off)
  async updateClearanceItem(checklistId: string, dto: UpdateClearanceItemDto): Promise<ClearanceChecklist> {
    const response = await apiService.patch<ClearanceChecklist>(
      `/offboarding/clearance-checklists/${checklistId}/items`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Update equipment return status
  async updateEquipmentItem(
    checklistId: string,
    equipmentName: string,
    dto: UpdateEquipmentItemDto
  ): Promise<ClearanceChecklist> {
    const response = await apiService.patch<ClearanceChecklist>(
      `/offboarding/clearance-checklists/${checklistId}/equipment/${encodeURIComponent(equipmentName)}`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Add equipment to checklist
  async addEquipmentToChecklist(checklistId: string, dto: UpdateEquipmentItemDto): Promise<ClearanceChecklist> {
    const response = await apiService.post<ClearanceChecklist>(
      `/offboarding/clearance-checklists/${checklistId}/equipment`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Update access card return status
  async updateCardReturn(checklistId: string, cardReturned: boolean): Promise<ClearanceChecklist> {
    const response = await apiService.patch<ClearanceChecklist>(
      `/offboarding/clearance-checklists/${checklistId}/card-return`,
      { cardReturned }
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // OFF-007: Revoke system access (System Admin)
  async revokeSystemAccess(dto: RevokeAccessDto): Promise<{
    success: boolean;
    employeeId: string;
    message: string;
    revokedAt: string;
  }> {
    const response = await apiService.post<{
      success: boolean;
      employeeId: string;
      message: string;
      revokedAt: string;
    }>('/offboarding/revoke-access', dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }

  // OFF-013: Trigger final settlement (HR Manager)
  async triggerFinalSettlement(dto: TriggerFinalSettlementDto): Promise<{
    success: boolean;
    terminationId: string;
    message: string;
    triggeredAt: string;
  }> {
    const response = await apiService.post<{
      success: boolean;
      terminationId: string;
      message: string;
      triggeredAt: string;
    }>('/offboarding/trigger-final-settlement', dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }
}

export const offboardingService = new OffboardingService();

