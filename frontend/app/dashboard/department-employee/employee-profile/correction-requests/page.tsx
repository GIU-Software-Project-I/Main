'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import Button from '@/app/components/ui/Button';

/**
 * My Correction Requests Page - Department Employee
 * US-E6-02: View and manage correction requests
 */
export default function CorrectionRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [showNewRequestForm, setShowNewRequestForm] = useState(false);

    // New request form state
    const [newRequest, setNewRequest] = useState({
        requestDescription: '',
        reason: ''
    });

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await employeeProfileService.getMyCorrectionRequests();
            if (response.error) {
                setError(response.error);
                setRequests([]);
            } else {
                // Handle both array response and paginated response
                const data = response.data;
                if (Array.isArray(data)) {
                    setRequests(data);
                } else if (data && typeof data === 'object' && 'items' in data) {
                    setRequests((data as any).items || []);
                } else if (data && typeof data === 'object' && 'data' in data) {
                    setRequests((data as any).data || []);
                } else {
                    setRequests([]);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load correction requests');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleSubmitNewRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newRequest.requestDescription.trim()) {
            setError('Please provide a description of what needs to be corrected');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const response = await employeeProfileService.submitCorrectionRequest({
                requestDescription: newRequest.requestDescription.trim(),
                reason: newRequest.reason.trim() || undefined
            });

            if (response.error) {
                setError(response.error);
            } else {
                setSuccessMessage('Correction request submitted successfully! HR will review it soon.');
                setNewRequest({ requestDescription: '', reason: '' });
                setShowNewRequestForm(false);
                // Refresh the list
                await fetchRequests();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit correction request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelRequest = async (requestId: string) => {
        if (!confirm('Are you sure you want to cancel this correction request?')) {
            return;
        }

        try {
            setCancelingId(requestId);
            setError(null);
            const response = await employeeProfileService.cancelCorrectionRequest(requestId);
            if (response.error) {
                setError(response.error);
            } else {
                setSuccessMessage('Correction request cancelled successfully');
                // Refresh the list
                await fetchRequests();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to cancel request');
        } finally {
            setCancelingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-slate-100 text-slate-800',
        };
        return styles[status as keyof typeof styles] || styles.PENDING;
    };

    const getStatusIcon = (status: string) => {
        const icons = {
            PENDING: '⏳',
            APPROVED: '✅',
            REJECTED: '❌',
            CANCELLED: '🚫',
        };
        return icons[status as keyof typeof icons] || '⏳';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading your correction requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Correction Requests</h1>
                    <p className="text-slate-600 mt-2">Request corrections to your profile data that requires HR approval</p>
                </div>
                <div className="flex gap-3">
                    {!showNewRequestForm && (
                        <Button onClick={() => setShowNewRequestForm(true)}>
                            + New Request
                        </Button>
                    )}
                    <Link href="/dashboard/department-employee/employee-profile">
                        <Button variant="outline">
                            ← Back to Profile
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <p className="text-green-800 font-medium">{successMessage}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <span className="text-red-600 text-xl">⚠</span>
                    <p className="text-red-800 font-medium">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-600 hover:text-red-800"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* New Request Form */}
            {showNewRequestForm && (
                <div className="bg-white rounded-lg border-2 border-blue-200 shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">📝 Submit New Correction Request</h3>
                        <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">New</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <p className="text-amber-800 text-sm">
                            <strong>Note:</strong> Correction requests are for changes to critical data that require HR approval
                            (e.g., name changes, national ID corrections, date of birth).
                            For contact information updates, use the "Update Contact" feature on your profile page.
                        </p>
                    </div>

                    <form onSubmit={handleSubmitNewRequest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                What needs to be corrected? <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={newRequest.requestDescription}
                                onChange={(e) => setNewRequest({ ...newRequest, requestDescription: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                placeholder="Please describe what information needs to be corrected. Include the current (incorrect) value and the correct value.&#10;&#10;Example: My first name is spelled incorrectly as 'Jonh'. It should be 'John'."
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">{newRequest.requestDescription.length} characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Reason for correction (optional)
                            </label>
                            <textarea
                                value={newRequest.reason}
                                onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                placeholder="Provide any additional context or reason for this correction..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-200">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Submitting...' : '📤 Submit Request'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowNewRequestForm(false);
                                    setNewRequest({ requestDescription: '', reason: '' });
                                }}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-2xl font-bold text-slate-900">{requests.length}</div>
                    <div className="text-sm text-slate-600">Total Requests</div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <div className="text-3xl mb-2">⏳</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {requests.filter(r => r.status === 'PENDING').length}
                    </div>
                    <div className="text-sm text-slate-600">Pending</div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-2xl font-bold text-green-600">
                        {requests.filter(r => r.status === 'APPROVED').length}
                    </div>
                    <div className="text-sm text-slate-600">Approved</div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <div className="text-3xl mb-2">❌</div>
                    <div className="text-2xl font-bold text-red-600">
                        {requests.filter(r => r.status === 'REJECTED').length}
                    </div>
                    <div className="text-sm text-slate-600">Rejected</div>
                </div>
            </div>

            {/* Requests List */}
            {requests.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Correction Requests</h3>
                    <p className="text-slate-600 mb-6">
                        You haven't submitted any correction requests yet.
                    </p>
                    {!showNewRequestForm && (
                        <Button onClick={() => setShowNewRequestForm(true)}>
                            Submit Your First Request
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div
                            key={request._id || request.id}
                            className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl">{getStatusIcon(request.status)}</div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-slate-900">
                                                Correction Request #{(request._id || request.id)?.slice(-8)}
                                            </h3>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                                                    request.status
                                                )}`}
                                            >
                                                {request.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            Submitted on {new Date(request.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Request Description */}
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-slate-900 mb-2">Description:</h4>
                                    <p className="text-slate-700 whitespace-pre-wrap">{request.requestDescription}</p>
                                </div>

                                {/* Reason */}
                                {request.reason && (
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-slate-900 mb-2">Reason:</h4>
                                        <p className="text-slate-700">{request.reason}</p>
                                    </div>
                                )}

                                {/* Review Information */}
                                {request.status === 'APPROVED' && request.reviewedAt && (
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 mb-2">✅ Approved</h4>
                                        <p className="text-green-800 text-sm">
                                            Reviewed on {new Date(request.reviewedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                        {request.reviewNotes && (
                                            <p className="text-green-700 text-sm mt-2">
                                                <strong>Notes:</strong> {request.reviewNotes}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {request.status === 'REJECTED' && request.reviewedAt && (
                                    <div className="bg-red-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-red-900 mb-2">❌ Rejected</h4>
                                        <p className="text-red-800 text-sm">
                                            Reviewed on {new Date(request.reviewedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                        {(request.reviewNotes || request.rejectionReason) && (
                                            <p className="text-red-700 text-sm mt-2">
                                                <strong>Reason:</strong> {request.reviewNotes || request.rejectionReason}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {request.status === 'PENDING' && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        disabled={cancelingId === (request._id || request.id)}
                                        onClick={() => handleCancelRequest(request._id || request.id)}
                                    >
                                        {cancelingId === (request._id || request.id) ? 'Canceling...' : 'Cancel Request'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
