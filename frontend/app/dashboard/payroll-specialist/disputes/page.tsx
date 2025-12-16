'use client';

import { useState, useEffect } from 'react';
import { payrollSpecialistService, PayrollDispute, DisputeReviewAction, DisputeFilters } from '@/app/services/payroll-specialist';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<PayrollDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<PayrollDispute | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [escalateToManager, setEscalateToManager] = useState(false);
  const [filters, setFilters] = useState<DisputeFilters>({
    status: 'all',
    type: 'all',
    priority: 'all'
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowedRoles = [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!hasAccess) return;
    loadDisputes();
  }, [user, filters]);

  const loadDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await payrollSpecialistService.getAllDisputes(filters);
      console.log('Disputes response:', response);
      
      // Map backend data to frontend format
      if (response.data) {
        const mappedDisputes = response.data.map((dispute: any) => {
          console.log('Mapping dispute:', dispute.disputeId, 'Status:', dispute.status);
          return {
            id: dispute._id,
            employeeId: dispute.employeeId?._id || dispute.employeeId,
            employeeName: dispute.employeeId?.firstName && dispute.employeeId?.lastName 
              ? `${dispute.employeeId.firstName} ${dispute.employeeId.lastName}`
              : 'Unknown',
            employeeNumber: dispute.employeeId?.employeeId || 'N/A',
            department: dispute.department || 'N/A',
            type: dispute.type || 'other',
            description: dispute.description,
            amount: dispute.amount,
            period: dispute.payslipId?.payPeriod || 'N/A',
            status: dispute.status,
            submittedAt: dispute.createdAt,
            reviewedAt: dispute.updatedAt,
            notes: dispute.resolutionComment,
            rejectionRemarks: dispute.rejectionReason,
            priority: dispute.priority || 'medium'
          };
        });
        console.log('Mapped disputes:', mappedDisputes);
        setDisputes(mappedDisputes);
      }
    } catch (error) {
      console.error('Failed to load disputes:', error);
      setError('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDispute = async () => {
    if (!selectedDispute) return;
    if (selectedDispute.status !== 'pending_review' && selectedDispute.status !== 'under_review') {
      setError('Only disputes with "Pending Review" or "Under Review" status can be acted upon');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Reviewing dispute:', selectedDispute.id, 'Action:', reviewAction);
      let response;
      
      if (reviewAction === 'approve') {
        response = await payrollSpecialistService.approveDispute(
          selectedDispute.id,
          escalateToManager,
          reviewNotes
        );
      } else {
        response = await payrollSpecialistService.rejectDispute(
          selectedDispute.id,
          rejectionRemarks
        );
      }

      console.log('Review response:', response);
      const updatedDispute = response.data || response;
      console.log('Updated dispute status:', updatedDispute?.status);
      
      setSuccessMessage(`Dispute ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`);
      setShowReviewModal(false);
      setSelectedDispute(null);
      setReviewNotes('');
      setRejectionRemarks('');
      setEscalateToManager(false);
      
      // Small delay to ensure DB write completes, then reload disputes
      setTimeout(async () => {
        await loadDisputes();
      }, 500);
    } catch (error) {
      console.error('Failed to review dispute:', error);
      setError(`Failed to ${reviewAction} dispute`);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (dispute: PayrollDispute, action: 'approve' | 'reject') => {
    setSelectedDispute(dispute);
    setReviewAction(action);
    setReviewNotes('');
    setEscalateToManager(false);
    setShowReviewModal(true);
  };

  const getPriorityColor = (priority: PayrollDispute['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: PayrollDispute['status']) => {
    switch (status) {
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved_by_specialist': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Payroll Specialist role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispute Review and Approval</h1>
          <p className="text-slate-600 mt-1">Review and approve/reject payroll disputes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.status || 'all'}
              onChange={(e) => setFilters((prev: DisputeFilters) => ({ ...prev, status: e.target.value as DisputeFilters['status'] }))}
            >
              <option value="all">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="approved_by_specialist">Approved by Specialist</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.type || 'all'}
              onChange={(e) => setFilters((prev: DisputeFilters) => ({ ...prev, type: e.target.value as DisputeFilters['type'] }))}
            >
              <option value="all">All Types</option>
              <option value="salary">Salary</option>
              <option value="deduction">Deduction</option>
              <option value="hours">Hours</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.priority || 'all'}
              onChange={(e) => setFilters((prev: DisputeFilters) => ({ ...prev, priority: e.target.value as DisputeFilters['priority'] }))}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payroll Period</label>
            <input
              type="month"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.period || ''}
              onChange={(e) => setFilters((prev: DisputeFilters) => ({ ...prev, period: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-end mt-4">
          <button
            onClick={loadDisputes}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {/* Disputes List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Disputes</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading disputes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {disputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{dispute.employeeName}</div>
                        <div className="text-xs text-slate-500">{dispute.employeeNumber}</div>
                        <div className="text-xs text-slate-500">{dispute.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 capitalize">{dispute.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 max-w-xs truncate">
                        {dispute.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {dispute.amount ? `$${dispute.amount.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(dispute.priority)}`}>
                        {dispute.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(dispute.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedDispute(dispute)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {(dispute.status === 'pending_review' || dispute.status === 'under_review') && (
                          <>
                            <button
                              onClick={() => openReviewModal(dispute, 'approve')}
                              className="text-green-600 hover:text-green-800"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openReviewModal(dispute, 'reject')}
                              className="text-red-600 hover:text-red-800"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disputes.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No disputes found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispute Details Modal */}
      {selectedDispute && !showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Dispute Details</h3>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Employee</label>
                  <p className="text-slate-900">{selectedDispute.employeeName}</p>
                  <p className="text-sm text-slate-600">{selectedDispute.employeeNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Department</label>
                  <p className="text-slate-900">{selectedDispute.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Type</label>
                  <p className="capitalize text-slate-900">{selectedDispute.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Amount</label>
                  <p className="text-slate-900">
                    {selectedDispute.amount ? `$${selectedDispute.amount.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Priority</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedDispute.priority)}`}>
                    {selectedDispute.priority}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedDispute.status)}`}>
                    {selectedDispute.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Description</label>
                <p className="text-slate-900 mt-1">{selectedDispute.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Period</label>
                <p className="text-slate-900">{selectedDispute.period}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Submitted</label>
                <p className="text-slate-900">{new Date(selectedDispute.submittedAt).toLocaleString()}</p>
              </div>
              {selectedDispute.notes && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Notes</label>
                  <p className="text-slate-900 mt-1">{selectedDispute.notes}</p>
                </div>
              )}
              {selectedDispute.attachments && selectedDispute.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Attachments</label>
                  <div className="mt-1 space-y-1">
                    {selectedDispute.attachments.map((attachment: string, index: number) => (
                      <div key={index} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                        {attachment}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {selectedDispute.status === 'pending_review' && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => openReviewModal(selectedDispute, 'reject')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => openReviewModal(selectedDispute, 'approve')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {reviewAction === 'approve' ? 'Approve Dispute' : 'Reject Dispute'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Dispute</label>
                <p className="text-slate-900">{selectedDispute.description}</p>
                <p className="text-sm text-slate-600">{selectedDispute.employeeName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {reviewAction === 'approve' ? 'Review Notes' : 'Rejection Remarks'}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={reviewAction === 'approve' ? "Add your review notes..." : "Provide rejection remarks..."}
                  value={reviewAction === 'approve' ? reviewNotes : rejectionRemarks}
                  onChange={(e) => reviewAction === 'approve' ? setReviewNotes(e.target.value) : setRejectionRemarks(e.target.value)}
                />
              </div>
              {reviewAction === 'approve' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="escalate"
                    className="mr-2"
                    checked={escalateToManager}
                    onChange={(e) => setEscalateToManager(e.target.checked)}
                  />
                  <label htmlFor="escalate" className="text-sm text-slate-700">
                    Escalate to Payroll Manager
                  </label>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewDispute}
                className={`px-4 py-2 text-white rounded-lg hover:opacity-90 ${
                  reviewAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {reviewAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}