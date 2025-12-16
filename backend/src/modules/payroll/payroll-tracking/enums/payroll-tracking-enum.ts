export enum ClaimStatus {
    UNDER_REVIEW = 'under review',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}
export enum DisputeStatus {
    PENDING_REVIEW = 'pending_review',
    UNDER_REVIEW = 'under_review',
    APPROVED = 'approved',
    APPROVED_BY_SPECIALIST = 'approved_by_specialist',
    REJECTED = 'rejected',
    ESCALATED = 'escalated'
}
export enum RefundStatus {
    PENDING = 'pending',
    PAID = 'paid' // when payroll execution
}