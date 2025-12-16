// =====================================================
// Recruitment Services - Axios-based API Layer
// =====================================================

import api from '../api';
import {
  JobTemplate,
  JobRequisition,
  CreateJobRequisitionRequest,
  Application,
  CreateApplicationRequest,
  UpdateApplicationStatusRequest,
  Interview,
  CreateInterviewRequest,
  AssessmentResult,
  SubmitAssessmentRequest,
  JobOffer,
  CreateJobOfferRequest,
  RecruitmentStats,
  RecruitmentPipeline,
  Candidate,
  RecruitmentDocument,
  RecruitmentNotification,
  AuditLog,
  AnalyticsSummary,
} from '@/app/types/recruitment';
import { ApplicationStage } from '@/app/types/enums';

// =====================================================
// Job Templates
// =====================================================

/**
 * Get all job templates
 */
export async function getJobTemplates() {
  return api.get<JobTemplate[]>('/recruitment/job-templates');
}

/**
 * Get a job template by ID
 */
export async function getJobTemplateById(id: string) {
  return api.get<JobTemplate>(`/recruitment/job-templates/${id}`);
}

/**
 * Create a new job template
 */
export async function createJobTemplate(data: Omit<JobTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
  return api.post<JobTemplate>('/recruitment/job-templates', data);
}

/**
 * Update a job template
 */
export async function updateJobTemplate(id: string, data: Partial<JobTemplate>) {
  return api.patch<JobTemplate>(`/recruitment/job-templates/${id}`, data);
}

/**
 * Delete a job template
 */
export async function deleteJobTemplate(id: string) {
  return api.delete(`/recruitment/job-templates/${id}`);
}

// =====================================================
// Job Requisitions (Jobs)
// =====================================================

/**
 * Get all job requisitions
 */
export async function getJobs() {
  return api.get<JobRequisition[]>('/recruitment/job-requisitions');
}

/**
 * Get a job requisition by ID
 */
export async function getJobById(id: string) {
  return api.get<JobRequisition>(`/recruitment/job-requisitions/${id}`);
}

/**
 * Create a new job requisition
 */
export async function createJob(data: CreateJobRequisitionRequest) {
  return api.post<JobRequisition>('/recruitment/job-requisitions', data);
}

/**
 * Update a job requisition
 */
export async function updateJob(id: string, data: Partial<JobRequisition>) {
  return api.patch<JobRequisition>(`/recruitment/job-requisitions/${id}`, data);
}

/**
 * Publish a job requisition
 */
export async function publishJob(id: string) {
  return api.patch<JobRequisition>(`/recruitment/job-requisitions/${id}/publish`, {});
}

/**
 * Unpublish a job requisition
 */
export async function unpublishJob(id: string) {
  return api.patch<JobRequisition>(`/recruitment/job-requisitions/${id}/unpublish`, {});
}

/**
 * Close a job requisition
 */
export async function closeJob(id: string) {
  return api.patch<JobRequisition>(`/recruitment/job-requisitions/${id}/close`, {});
}

/**
 * Delete a job requisition
 */
export async function deleteJob(id: string) {
  return api.delete(`/recruitment/job-requisitions/${id}`);
}

// =====================================================
// Applications
// =====================================================

/**
 * Get all applications
 */
export async function getApplications(filters?: {
  requisitionId?: string;
  status?: string;
  stage?: ApplicationStage;
}) {
  const params = new URLSearchParams();
  if (filters?.requisitionId) params.append('requisitionId', filters.requisitionId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.stage) params.append('stage', filters.stage);
  
  const query = params.toString();
  return api.get<Application[]>(`/recruitment/applications${query ? `?${query}` : ''}`);
}

/**
 * Get an application by ID
 */
export async function getApplicationById(id: string) {
  return api.get<Application>(`/recruitment/applications/${id}`);
}

/**
 * Create a new application (apply to a job)
 */
export async function applyToJob(jobId: string, formData: FormData) {
  // FormData will contain CV file and other application data
  return api.postFormData<Application>(`/recruitment/applications`, formData);
}

/**
 * Create an application (internal use)
 */
export async function createApplication(data: CreateApplicationRequest) {
  return api.post<Application>('/recruitment/applications', data);
}

/**
 * Update application status/stage
 */
export async function updateApplicationStage(id: string, stage: ApplicationStage) {
  return api.patch<Application>(`/recruitment/applications/${id}/stage`, { stage });
}

/**
 * Update application status
 */
export async function updateApplicationStatus(id: string, data: UpdateApplicationStatusRequest) {
  return api.patch<Application>(`/recruitment/applications/${id}/status`, data);
}

/**
 * Reject an application
 */
export async function rejectApplication(id: string, reason?: string) {
  return api.patch<Application>(`/recruitment/applications/${id}/reject`, { reason });
}

/**
 * Get application history/timeline
 */
export async function getApplicationHistory(id: string) {
  return api.get(`/recruitment/applications/${id}/history`);
}

// =====================================================
// Interviews
// =====================================================

/**
 * Get all interviews
 */
export async function getInterviews(applicationId?: string) {
  const query = applicationId ? `?applicationId=${applicationId}` : '';
  return api.get<Interview[]>(`/recruitment/interviews${query}`);
}

/**
 * Get an interview by ID
 */
export async function getInterviewById(id: string) {
  return api.get<Interview>(`/recruitment/interviews/${id}`);
}

/**
 * Schedule a new interview
 */
export async function scheduleInterview(data: CreateInterviewRequest) {
  return api.post<Interview>('/recruitment/interviews', data);
}

/**
 * Update an interview
 */
export async function updateInterview(id: string, data: Partial<Interview>) {
  return api.patch<Interview>(`/recruitment/interviews/${id}`, data);
}

/**
 * Cancel an interview
 */
export async function cancelInterview(id: string) {
  return api.patch<Interview>(`/recruitment/interviews/${id}/cancel`, {});
}

/**
 * Complete an interview
 */
export async function completeInterview(id: string) {
  return api.patch<Interview>(`/recruitment/interviews/${id}/complete`, {});
}

// =====================================================
// Interview Feedback / Assessment
// =====================================================

/**
 * Submit interview feedback/assessment
 */
export async function submitInterviewFeedback(data: SubmitAssessmentRequest) {
  return api.post<AssessmentResult>('/recruitment/assessments', data);
}

/**
 * Get assessment results for an interview
 */
export async function getAssessmentResults(interviewId: string) {
  return api.get<AssessmentResult[]>(`/recruitment/assessments?interviewId=${interviewId}`);
}

// =====================================================
// Offers
// =====================================================

/**
 * Get all offers
 */
export async function getOffers(applicationId?: string) {
  const query = applicationId ? `?applicationId=${applicationId}` : '';
  return api.get<JobOffer[]>(`/recruitment/offers${query}`);
}

/**
 * Get an offer by ID
 */
export async function getOfferById(id: string) {
  return api.get<JobOffer>(`/recruitment/offers/${id}`);
}

/**
 * Create a new offer
 */
export async function createOffer(data: CreateJobOfferRequest) {
  return api.post<JobOffer>('/recruitment/offers', data);
}

/**
 * Approve an offer (for approvers)
 */
export async function approveOffer(id: string, comment?: string) {
  return api.patch<JobOffer>(`/recruitment/offers/${id}/approve`, { comment });
}

/**
 * Reject an offer (for approvers)
 */
export async function rejectOffer(id: string, comment?: string) {
  return api.patch<JobOffer>(`/recruitment/offers/${id}/reject`, { comment });
}

/**
 * Send offer to candidate
 */
export async function sendOffer(id: string) {
  return api.patch<JobOffer>(`/recruitment/offers/${id}/send`, {});
}

/**
 * Candidate responds to offer (accept/reject)
 */
export async function respondToOffer(id: string, response: 'accepted' | 'rejected') {
  return api.patch<JobOffer>(`/recruitment/offers/${id}/respond`, { response });
}

/**
 * Sign offer (candidate signature)
 */
export async function signOffer(id: string, signatureData: string) {
  return api.patch<JobOffer>(`/recruitment/offers/${id}/sign`, { signature: signatureData });
}

// =====================================================
// Candidates
// =====================================================

/**
 * Get all candidates
 */
export async function getCandidates() {
  return api.get<Candidate[]>('/recruitment/candidates');
}

/**
 * Get a candidate by ID
 */
export async function getCandidateById(id: string) {
  return api.get<Candidate>(`/recruitment/candidates/${id}`);
}

/**
 * Create a candidate profile
 */
export async function createCandidate(data: Partial<Candidate>) {
  return api.post<Candidate>('/recruitment/candidates', data);
}

/**
 * Update candidate profile
 */
export async function updateCandidate(id: string, data: Partial<Candidate>) {
  return api.patch<Candidate>(`/recruitment/candidates/${id}`, data);
}

// =====================================================
// Documents
// =====================================================

/**
 * Upload a document (CV, etc.)
 */
export async function uploadDocument(formData: FormData) {
  return api.postFormData<RecruitmentDocument>('/recruitment/documents', formData);
}

/**
 * Get documents for a candidate/employee
 */
export async function getDocuments(ownerId: string) {
  return api.get<RecruitmentDocument[]>(`/recruitment/documents?ownerId=${ownerId}`);
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string) {
  return api.delete(`/recruitment/documents/${id}`);
}

// =====================================================
// Analytics & Statistics
// =====================================================

/**
 * Get recruitment statistics
 */
export async function getRecruitmentStats() {
  return api.get<RecruitmentStats>('/recruitment/analytics/stats');
}

/**
 * Get recruitment pipeline data
 */
export async function getRecruitmentPipeline() {
  return api.get<RecruitmentPipeline[]>('/recruitment/analytics/pipeline');
}

/**
 * Get time-to-hire report
 */
export async function getTimeToHireReport(params?: { startDate?: string; endDate?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  
  const query = searchParams.toString();
  return api.get(`/recruitment/analytics/time-to-hire${query ? `?${query}` : ''}`);
}

// =====================================================
// Referrals
// =====================================================

/**
 * Tag a candidate as referral
 */
export async function tagAsReferral(candidateId: string, referrerId: string, requisitionId?: string) {
  return api.post('/recruitment/referrals', {
    candidateId,
    referrerId,
    requisitionId,
  });
}

/**
 * Get referrals
 */
export async function getReferrals() {
  return api.get('/recruitment/referrals');
}

// =====================================================
// Notifications (BR-11, BR-36)
// =====================================================

/**
 * Mock notification data for development
 * TODO: Replace with actual backend API when available
 */
const mockNotifications: RecruitmentNotification[] = [
  {
    id: 'notif-1',
    type: 'application_stage_change',
    title: 'Application Stage Updated',
    message: 'John Doe moved to HR Interview stage for Software Engineer position',
    entityId: 'app-123',
    entityType: 'application',
    actorId: 'hr-001',
    actorName: 'Sarah HR',
    actorRole: 'HR Employee',
    recipientId: 'current-user',
    recipientRole: 'HR_MANAGER',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
  },
  {
    id: 'notif-2',
    type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: 'Technical interview scheduled for Jane Smith on Dec 18, 2024 at 10:00 AM',
    entityId: 'int-456',
    entityType: 'interview',
    actorId: 'rec-001',
    actorName: 'Mike Recruiter',
    actorRole: 'Recruiter',
    recipientId: 'current-user',
    recipientRole: 'HR_MANAGER',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 'notif-3',
    type: 'offer_approved',
    title: 'Offer Approved',
    message: 'Offer for Alex Johnson has been approved and is ready to send',
    entityId: 'offer-789',
    entityType: 'offer',
    actorId: 'mgr-001',
    actorName: 'Department Head',
    actorRole: 'HR Manager',
    recipientId: 'current-user',
    recipientRole: 'HR_EMPLOYEE',
    read: true,
    readAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  },
  {
    id: 'notif-4',
    type: 'offer_accepted',
    title: 'Offer Accepted',
    message: 'Emily Wilson has accepted the offer for Product Manager position',
    entityId: 'offer-101',
    entityType: 'offer',
    actorName: 'Emily Wilson',
    actorRole: 'Candidate',
    recipientId: 'current-user',
    recipientRole: 'HR_MANAGER',
    read: true,
    readAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: 'notif-5',
    type: 'rejection_sent',
    title: 'Rejection Notification Sent',
    message: 'Rejection email sent to 3 candidates for Marketing Specialist position',
    entityId: 'job-202',
    entityType: 'job',
    actorId: 'hr-001',
    actorName: 'System',
    actorRole: 'System',
    recipientId: 'current-user',
    recipientRole: 'HR_EMPLOYEE',
    read: true,
    readAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
];

/**
 * Get notifications for current user
 * TODO: Implement backend endpoint
 */
export async function getNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<{ data: RecruitmentNotification[] }> {
  // TODO: Replace with actual API call when backend is ready
  // return api.get<RecruitmentNotification[]>('/recruitment/notifications', { params });
  
  let notifications = [...mockNotifications];
  
  if (params?.unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }
  
  if (params?.limit) {
    notifications = notifications.slice(0, params.limit);
  }
  
  return { data: notifications };
}

/**
 * Mark notification as read
 * TODO: Implement backend endpoint
 */
export async function markNotificationRead(id: string): Promise<{ data: RecruitmentNotification }> {
  // TODO: Replace with actual API call when backend is ready
  // return api.patch<RecruitmentNotification>(`/recruitment/notifications/${id}/read`, {});
  
  const notification = mockNotifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
    notification.readAt = new Date().toISOString();
  }
  return { data: notification! };
}

/**
 * Mark all notifications as read
 * TODO: Implement backend endpoint
 */
export async function markAllNotificationsRead(): Promise<{ data: { count: number } }> {
  // TODO: Replace with actual API call when backend is ready
  // return api.patch('/recruitment/notifications/mark-all-read', {});
  
  let count = 0;
  mockNotifications.forEach(n => {
    if (!n.read) {
      n.read = true;
      n.readAt = new Date().toISOString();
      count++;
    }
  });
  return { data: { count } };
}

/**
 * Get unread notification count
 * TODO: Implement backend endpoint
 */
export async function getUnreadNotificationCount(): Promise<{ data: { count: number } }> {
  // TODO: Replace with actual API call when backend is ready
  // return api.get('/recruitment/notifications/unread-count');
  
  const count = mockNotifications.filter(n => !n.read).length;
  return { data: { count } };
}

// =====================================================
// Audit Logs (BR-37, BR-26)
// =====================================================

/**
 * Mock audit log data for development
 * TODO: Replace with actual backend API when available
 */
const mockAuditLogs: Record<string, AuditLog[]> = {
  'app-123': [
    {
      id: 'audit-1',
      entityId: 'app-123',
      entityType: 'application',
      eventType: 'application_created',
      title: 'Application Submitted',
      description: 'Candidate applied for the position',
      actorName: 'John Doe',
      actorType: 'candidate',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-2',
      entityId: 'app-123',
      entityType: 'application',
      eventType: 'consent_given',
      title: 'Consent Provided',
      description: 'Candidate consented to data processing and background checks',
      actorName: 'John Doe',
      actorType: 'candidate',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-3',
      entityId: 'app-123',
      entityType: 'application',
      eventType: 'stage_change',
      title: 'Moved to Screening',
      description: 'Application moved from New to Screening stage',
      actorId: 'hr-001',
      actorName: 'Sarah HR',
      actorType: 'hr_employee',
      previousValue: 'new',
      newValue: 'screening',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-4',
      entityId: 'app-123',
      entityType: 'application',
      eventType: 'interview_scheduled',
      title: 'Interview Scheduled',
      description: 'Department interview scheduled for Dec 15, 2024',
      actorId: 'rec-001',
      actorName: 'Mike Recruiter',
      actorType: 'recruiter',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-5',
      entityId: 'app-123',
      entityType: 'application',
      eventType: 'email_sent',
      title: 'Interview Invitation Sent',
      description: 'Email notification sent to candidate with interview details',
      actorName: 'System',
      actorType: 'system',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-6',
      entityId: 'app-123',
      entityType: 'application',
      eventType: 'feedback_submitted',
      title: 'Interview Feedback Submitted',
      description: 'Panel member submitted interview assessment with score 85/100',
      actorId: 'mgr-001',
      actorName: 'Department Head',
      actorType: 'hr_manager',
      metadata: { score: 85 },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-7',
      entityId: 'app-123',
      entityType: 'application',
      eventType: 'stage_change',
      title: 'Moved to HR Interview',
      description: 'Application advanced to HR Interview stage',
      actorId: 'hr-001',
      actorName: 'Sarah HR',
      actorType: 'hr_employee',
      previousValue: 'department_interview',
      newValue: 'hr_interview',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'offer-789': [
    {
      id: 'audit-o1',
      entityId: 'offer-789',
      entityType: 'offer',
      eventType: 'offer_created',
      title: 'Offer Created',
      description: 'Job offer created with salary $85,000 and signing bonus $5,000',
      actorId: 'hr-001',
      actorName: 'Sarah HR',
      actorType: 'hr_employee',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-o2',
      entityId: 'offer-789',
      entityType: 'offer',
      eventType: 'offer_approved',
      title: 'Offer Approved',
      description: 'Offer approved by HR Manager',
      actorId: 'mgr-001',
      actorName: 'HR Manager',
      actorType: 'hr_manager',
      metadata: { comment: 'Approved. Candidate is an excellent fit.' },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-o3',
      entityId: 'offer-789',
      entityType: 'offer',
      eventType: 'offer_sent',
      title: 'Offer Sent to Candidate',
      description: 'Offer letter sent to candidate via email',
      actorId: 'hr-001',
      actorName: 'Sarah HR',
      actorType: 'hr_employee',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-o4',
      entityId: 'offer-789',
      entityType: 'offer',
      eventType: 'email_sent',
      title: 'Email Notification Sent',
      description: 'Offer letter email delivered successfully',
      actorName: 'System',
      actorType: 'system',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

/**
 * Get audit logs for an entity
 * TODO: Implement backend endpoint
 */
export async function getAuditLogs(
  entityId: string,
  entityType?: 'application' | 'interview' | 'offer' | 'job' | 'candidate'
): Promise<{ data: AuditLog[] }> {
  // TODO: Replace with actual API call when backend is ready
  // return api.get<AuditLog[]>(`/recruitment/audit-logs`, { params: { entityId, entityType } });
  
  const logs = mockAuditLogs[entityId] || [];
  return { data: logs };
}

// =====================================================
// Analytics Summary (BR-33)
// =====================================================

/**
 * Mock analytics summary for development
 * TODO: Replace with actual backend API when available
 */
const mockAnalyticsSummary: AnalyticsSummary = {
  overview: {
    totalOpenPositions: 12,
    totalApplications: 156,
    pendingInterviews: 8,
    offersExtended: 5,
    hiredThisMonth: 3,
    rejectedThisMonth: 18,
  },
  timeToHire: {
    average: 28,
    byDepartment: [
      { departmentId: 'dept-1', departmentName: 'Engineering', averageDays: 32 },
      { departmentId: 'dept-2', departmentName: 'Marketing', averageDays: 24 },
      { departmentId: 'dept-3', departmentName: 'Sales', averageDays: 21 },
      { departmentId: 'dept-4', departmentName: 'Operations', averageDays: 26 },
    ],
    trend: [
      { month: 'Jul 2024', averageDays: 35 },
      { month: 'Aug 2024', averageDays: 32 },
      { month: 'Sep 2024', averageDays: 30 },
      { month: 'Oct 2024', averageDays: 28 },
      { month: 'Nov 2024', averageDays: 27 },
      { month: 'Dec 2024', averageDays: 28 },
    ],
  },
  pipeline: [
    { stage: 'Screening', count: 45, percentage: 28.8 },
    { stage: 'Department Interview', count: 32, percentage: 20.5 },
    { stage: 'HR Interview', count: 18, percentage: 11.5 },
    { stage: 'Offer', count: 8, percentage: 5.1 },
    { stage: 'Hired', count: 3, percentage: 1.9 },
    { stage: 'Rejected', count: 50, percentage: 32.1 },
  ],
  sourceEffectiveness: [
    { source: 'LinkedIn', applications: 68, hires: 2, conversionRate: 2.9 },
    { source: 'Company Website', applications: 42, hires: 1, conversionRate: 2.4 },
    { source: 'Referral', applications: 24, hires: 2, conversionRate: 8.3 },
    { source: 'Indeed', applications: 15, hires: 0, conversionRate: 0 },
    { source: 'Other', applications: 7, hires: 0, conversionRate: 0 },
  ],
  conversionRates: [
    { fromStage: 'Screening', toStage: 'Department Interview', rate: 71.1 },
    { fromStage: 'Department Interview', toStage: 'HR Interview', rate: 56.3 },
    { fromStage: 'HR Interview', toStage: 'Offer', rate: 44.4 },
    { fromStage: 'Offer', toStage: 'Hired', rate: 60.0 },
  ],
};

/**
 * Get analytics summary
 * TODO: Implement backend endpoint
 */
export async function getAnalyticsSummary(params?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}): Promise<{ data: AnalyticsSummary }> {
  // TODO: Replace with actual API call when backend is ready
  // const searchParams = new URLSearchParams();
  // if (params?.startDate) searchParams.append('startDate', params.startDate);
  // if (params?.endDate) searchParams.append('endDate', params.endDate);
  // if (params?.departmentId) searchParams.append('departmentId', params.departmentId);
  // return api.get<AnalyticsSummary>(`/recruitment/analytics/summary?${searchParams.toString()}`);
  
  return { data: mockAnalyticsSummary };
}

// Export all functions as a service object for convenience
const recruitmentService = {
  // Job Templates
  getJobTemplates,
  getJobTemplateById,
  createJobTemplate,
  updateJobTemplate,
  deleteJobTemplate,
  
  // Jobs
  getJobs,
  getJobById,
  createJob,
  updateJob,
  publishJob,
  unpublishJob,
  closeJob,
  deleteJob,
  
  // Applications
  getApplications,
  getApplicationById,
  applyToJob,
  createApplication,
  updateApplicationStage,
  updateApplicationStatus,
  rejectApplication,
  getApplicationHistory,
  
  // Interviews
  getInterviews,
  getInterviewById,
  scheduleInterview,
  updateInterview,
  cancelInterview,
  completeInterview,
  
  // Feedback
  submitInterviewFeedback,
  getAssessmentResults,
  
  // Offers
  getOffers,
  getOfferById,
  createOffer,
  approveOffer,
  rejectOffer,
  sendOffer,
  respondToOffer,
  signOffer,
  
  // Candidates
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  
  // Documents
  uploadDocument,
  getDocuments,
  deleteDocument,
  
  // Analytics
  getRecruitmentStats,
  getRecruitmentPipeline,
  getTimeToHireReport,
  getAnalyticsSummary,
  
  // Referrals
  tagAsReferral,
  getReferrals,
  
  // Notifications (BR-11, BR-36)
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  
  // Audit Logs (BR-37, BR-26)
  getAuditLogs,
};

export default recruitmentService;
