import Link from 'next/link';

export interface ChangeRequest {
    _id: string;
    requestId: string;
    employeeProfileId: string | { _id: string; personalInfo?: { firstName?: string; lastName?: string; }; employeeId?: string }; // Populate logic might differ
    requestDescription: string;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    submittedAt: string;
    processedAt?: string;
    rejectionReason?: string;
    changeType?: string; // Optional field if not in schema but useful for UI
}

interface ChangeRequestCardProps {
    request: ChangeRequest;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
    processing: boolean;
}

export function ChangeRequestCard({ request, onApprove, onReject, processing }: ChangeRequestCardProps) {
    // Helper to safely get employee name
    const getEmployeeName = () => {
        if (typeof request.employeeProfileId === 'object' && request.employeeProfileId !== null) {
            if ('personalInfo' in request.employeeProfileId) {
                const { firstName, lastName } = (request.employeeProfileId as any).personalInfo || {};
                return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown Employee';
            }
            return 'Unknown Employee';
        }
        return `Employee ${request.employeeProfileId}`; // Fallback if not populated
    };

    const employeeName = getEmployeeName();

    const handleRejectClick = () => {
        const reason = window.prompt("Enter rejection reason:");
        if (reason) {
            onReject(request._id, reason);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Avatar / Icon */}
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                        {employeeName.charAt(0)}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground text-lg">{employeeName}</h3>
                            <p className="text-sm text-muted-foreground">
                                Request ID: {request.requestId || request._id} • {new Date(request.submittedAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className={`
              px-3 py-1 rounded-full text-xs font-medium border
              ${request.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : ''}
              ${request.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : ''}
              ${request.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : ''}
            `}>
                            {request.status}
                        </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                        <div>
                            <span className="font-medium text-foreground">Change: </span>
                            <span className="text-muted-foreground">{request.requestDescription}</span>
                        </div>
                        {request.reason && (
                            <div>
                                <span className="font-medium text-foreground">Reason: </span>
                                <span className="text-muted-foreground">{request.reason}</span>
                            </div>
                        )}
                        {request.rejectionReason && (
                            <div className="text-destructive">
                                <span className="font-medium">Rejection Reason: </span>
                                <span>{request.rejectionReason}</span>
                            </div>
                        )}
                    </div>

                    {request.status === 'PENDING' && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            <button
                                onClick={() => onApprove(request._id)}
                                disabled={processing}
                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {processing ? 'Processing...' : 'Approve Request'}
                            </button>
                            <button
                                onClick={handleRejectClick}
                                disabled={processing}
                                className="px-4 py-2 bg-destructive/10 text-destructive text-sm font-medium rounded-lg hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                            >
                                Reject
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
