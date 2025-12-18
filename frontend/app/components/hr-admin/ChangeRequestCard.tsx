'use client';

import { useState } from 'react';
import { StatusBadge } from '@/app/components/ui/status-badge';

export interface ChangeRequest {
    _id: string;
    requestId: string;
    employeeId: string | {
        _id: string;
        firstName: string;
        lastName: string;
        fullName?: string;
        employeeNumber: string;
        workEmail: string;
    };
    fieldName: string;
    oldValue: any;
    newValue: any;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
    reason?: string;
    rejectionReason?: string;
    processedBy?: string;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface ChangeRequestCardProps {
    request: ChangeRequest;
    onApprove: (requestId: string) => Promise<void>;
    onReject: (requestId: string, reason: string) => Promise<void>;
    processing?: boolean;
}

const STATUS_ICONS: Record<string, string> = {
    PENDING: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    APPROVED: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    REJECTED: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    CANCELED: 'M6 18L18 6M6 6l12 12',
};

const FIELD_LABELS: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    middleName: 'Middle Name',
    workEmail: 'Work Email',
    mobilePhone: 'Mobile Phone',
    personalEmail: 'Personal Email',
    homeAddress: 'Home Address',
    city: 'City',
    country: 'Country',
    biography: 'Biography',
    profilePictureUrl: 'Profile Picture',
    dateOfBirth: 'Date of Birth',
    maritalStatus: 'Marital Status',
};

export default function ChangeRequestCard({ request, onApprove, onReject, processing }: ChangeRequestCardProps) {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [expanded, setExpanded] = useState(false);

    const statusIcon = STATUS_ICONS[request.status] || STATUS_ICONS.PENDING;
    const isPending = request.status === 'PENDING';

    const getEmployeeInfo = () => {
        if (typeof request.employeeId === 'object') {
            return {
                name: request.employeeId.fullName || `${request.employeeId.firstName} ${request.employeeId.lastName}`,
                number: request.employeeId.employeeNumber,
                email: request.employeeId.workEmail,
                initials: `${request.employeeId.firstName?.[0] || ''}${request.employeeId.lastName?.[0] || ''}`.toUpperCase(),
            };
        }
        return { name: 'Unknown', number: request.employeeId, email: '', initials: '??' };
    };

    const employee = getEmployeeInfo();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatValue = (value: any) => {
        if (value === null || value === undefined || value === '') return <span className="text-muted-foreground italic">Empty</span>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) return;
        await onReject(request.requestId, rejectReason);
        setShowRejectModal(false);
        setRejectReason('');
    };

    return (
        <div className={`bg-card border rounded-xl overflow-hidden transition-all ${isPending ? 'border-warning/50' : 'border-border'}`}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
                        {employee.initials}
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">{employee.number} • {employee.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={request.status} showDot />
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        <svg className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-foreground">
                        {FIELD_LABELS[request.fieldName] || request.fieldName}
                    </span>
                    <span className="text-xs text-muted-foreground">• Requested {formatDate(request.createdAt)}</span>
                </div>

                {/* Change Comparison */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-xs font-medium text-destructive mb-1">Previous Value</p>
                        <p className="text-sm text-foreground break-words">{formatValue(request.oldValue)}</p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">New Value</p>
                        <p className="text-sm text-foreground break-words">{formatValue(request.newValue)}</p>
                    </div>
                </div>

                {/* Reason if provided */}
                {request.reason && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Employee's Reason</p>
                        <p className="text-sm text-foreground">{request.reason}</p>
                    </div>
                )}

                {/* Rejection reason if rejected */}
                {request.status === 'REJECTED' && request.rejectionReason && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-xs font-medium text-destructive mb-1">Rejection Reason</p>
                        <p className="text-sm text-destructive/80">{request.rejectionReason}</p>
                    </div>
                )}

                {/* Expanded Details */}
                {expanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Request ID</span>
                            <span className="font-mono text-foreground">{request.requestId || request._id}</span>
                        </div>
                        {request.processedAt && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Processed At</span>
                                <span className="text-foreground">{formatDate(request.processedAt)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions for Pending */}
            {isPending && (
                <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-end gap-3">
                    <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={processing}
                        className="px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => onApprove(request.requestId)}
                        disabled={processing}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {processing ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
                    <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Reject Change Request</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Rejection Reason <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                rows={3}
                                placeholder="Please provide a reason for rejection..."
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                disabled={!rejectReason.trim() || processing}
                                className="px-4 py-2 text-sm font-medium text-white bg-destructive rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                            >
                                Reject Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
