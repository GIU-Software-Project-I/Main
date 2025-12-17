'use client';

import { useState, useEffect } from 'react';
import { payrollManagerService, ClaimConfirmation } from '@/app/services/payroll-manager';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function PayrollManagerClaimsPage() {
  const { user } = useAuth();
  const allowedRoles = [SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = !!user && allowedRoles.includes(user.role);
  const [claims, setClaims] = useState<ClaimConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimConfirmation | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'approve' | 'reject'>('approve');
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAccess) return;
    loadClaims();
  }, [user, hasAccess]);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      // Only fetch claims with 'pending payroll Manager approval' status
      const response = await payrollManagerService.getPendingClaimConfirmations();
      
      if (response.error) {
        console.error('Error fetching pending claims:', response.error);
        setError('Failed to load claims');
      }
      
      if (response.data && Array.isArray(response.data)) {
        setClaims(response.data);
      } else {
        setClaims([]);
      }
    } catch (error) {
      console.error('Failed to load claim confirmations:', error);
      setError('Failed to load claims');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmModal = (claim: ClaimConfirmation, action: 'approve' | 'reject') => {
    setSelectedClaim(claim);
    setConfirmationAction(action);
    setConfirmationNotes('');
    setShowConfirmModal(true);
  };

  const handleConfirmation = async () => {
    if (!selectedClaim) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await payrollManagerService.confirmClaim({
        claimId: selectedClaim.id,
        confirmed: confirmationAction === 'approve',
        notes: confirmationNotes,
      });

      if (response.error) {
        setError(`Failed to ${confirmationAction} claim: ${response.error}`);
        return;
      }

      if (response.data) {
        setSuccessMessage(`Claim ${confirmationAction === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowConfirmModal(false);
        setSelectedClaim(null);
        setConfirmationNotes('');
        
        // Reload claims
        await loadClaims();
      }
    } catch (error) {
      console.error('Failed to process claim:', error);
      setError(`Failed to ${confirmationAction} claim. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending payroll Manager approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Payroll Manager role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Claims Approval</h1>
          <p className="text-slate-600 mt-1">Review and approve/reject expense claims from Payroll Specialists</p>
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

      {/* Claims List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Pending Claims Approval ({claims.length})</h2>
          <p className="text-sm text-slate-600 mt-1">Claims approved by specialists awaiting your confirmation</p>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading claims...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Claim Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Approved Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{claim.employeeName}</div>
                        <div className="text-xs text-slate-500">{claim.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{claim.claimType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${claim.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${claim.approvedAmount ? claim.approvedAmount.toLocaleString() : claim.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>
                        {claim.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openConfirmModal(claim, 'approve')}
                          className="text-green-600 hover:text-green-800"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openConfirmModal(claim, 'reject')}
                          className="text-red-600 hover:text-red-800"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {claims.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No claims pending confirmation
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {confirmationAction === 'approve' ? 'Approve' : 'Reject'} Claim
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Claim</label>
                <p className="text-slate-900">{selectedClaim.claimType}</p>
                <p className="text-sm text-slate-600">{selectedClaim.employeeName}</p>
                <p className="text-sm text-slate-600">Amount: ${selectedClaim.amount.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Approved Amount: ${selectedClaim.approvedAmount?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add your notes..."
                  value={confirmationNotes}
                  onChange={(e) => setConfirmationNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedClaim(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmation}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmationAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmationAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
