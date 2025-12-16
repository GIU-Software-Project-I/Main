'use client';

import { useState, useEffect } from 'react';
import { payrollManagerService, ClaimConfirmation } from '@/app/services/payroll-manager';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function PayrollManagerClaimsPage() {
  const { hasRole } = useAuth();
  const [claims, setClaims] = useState<ClaimConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimConfirmation | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [filter, setFilter] = useState<'pending_confirmation' | 'confirmed' | 'under review' | 'all'>('pending_confirmation');

  useEffect(() => {
    if (!hasRole([SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN])) return;
    loadClaims();
  }, [hasRole, filter]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      // Fetch pending, confirmed, and under review claims
      const [pendingResponse, confirmedResponse, underReviewResponse] = await Promise.all([
        payrollManagerService.getPendingClaimConfirmations(),
        payrollManagerService.getConfirmedClaims(),
        payrollManagerService.getUnderReviewClaims(),
      ]);
      
      // Check for errors in responses
      if (pendingResponse.error) {
        console.error('Error fetching pending claims:', pendingResponse.error);
      }
      if (confirmedResponse.error) {
        console.error('Error fetching confirmed claims:', confirmedResponse.error);
      }
      if (underReviewResponse.error) {
        console.error('Error fetching under review claims:', underReviewResponse.error);
      }
      
      console.log('Claims responses:', {
        pending: pendingResponse.data?.length || 0,
        confirmed: confirmedResponse.data?.length || 0,
        underReview: underReviewResponse.data?.length || 0,
        errors: {
          pending: pendingResponse.error,
          confirmed: confirmedResponse.error,
          underReview: underReviewResponse.error,
        },
      });
      
      // Use a Map to avoid duplicates by ID
      const claimsMap = new Map<string, ClaimConfirmation>();
      
      // Add pending claims
      if (pendingResponse.data && Array.isArray(pendingResponse.data)) {
        pendingResponse.data.forEach((c: ClaimConfirmation) => {
          claimsMap.set(c.id, c);
        });
      }
      
      // Add confirmed claims (will overwrite pending if same ID, which is correct)
      if (confirmedResponse.data && Array.isArray(confirmedResponse.data)) {
        confirmedResponse.data.forEach((c: ClaimConfirmation) => {
          claimsMap.set(c.id, c);
        });
      }
      
      // Add under review claims
      if (underReviewResponse.data && Array.isArray(underReviewResponse.data)) {
        underReviewResponse.data.forEach((c: ClaimConfirmation) => {
          claimsMap.set(c.id, c);
        });
      }
      
      const allClaims = Array.from(claimsMap.values());
      
      // Filter based on selected filter
      let filtered: ClaimConfirmation[] = [];
      if (filter === 'all') {
        filtered = allClaims;
      } else if (filter === 'pending_confirmation') {
        filtered = allClaims.filter((c: ClaimConfirmation) => 
          c.status === 'pending_confirmation'
        );
      } else if (filter === 'confirmed') {
        filtered = allClaims.filter((c: ClaimConfirmation) => 
          c.status === 'confirmed'
        );
      } else if (filter === 'under review') {
        filtered = allClaims.filter((c: ClaimConfirmation) => 
          c.status === 'under review'
        );
      }
      
      console.log(`Filtered claims for "${filter}":`, filtered.length);
      setClaims(filtered);
    } catch (error) {
      console.error('Failed to load claim confirmations:', error);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClaim = async () => {
    if (!selectedClaim) return;

    try {
      const response = await payrollManagerService.confirmClaim({
        claimId: selectedClaim.id,
        confirmed: true,
        notes: confirmationNotes,
      });

      if (response.error) {
        console.error('Failed to confirm claim:', response.error);
        alert(`Error: ${response.error}`);
        return;
      }

      if (response.data) {
        setShowConfirmModal(false);
        setSelectedClaim(null);
        setConfirmationNotes('');
        // Reload claims to get updated list
        await loadClaims();
      }
    } catch (error) {
      console.error('Failed to confirm claim:', error);
      alert('Failed to confirm claim. Please try again.');
    }
  };

  const handleRejectClaim = async () => {
    if (!selectedClaim) return;

    try {
      const response = await payrollManagerService.confirmClaim({
        claimId: selectedClaim.id,
        confirmed: false,
        notes: confirmationNotes,
      });

      if (response.error) {
        console.error('Failed to reject claim:', response.error);
        alert(`Error: ${response.error}`);
        return;
      }

      if (response.data) {
        setShowConfirmModal(false);
        setSelectedClaim(null);
        setConfirmationNotes('');
        // Reload claims to get updated list
        await loadClaims();
      }
    } catch (error) {
      console.error('Failed to reject claim:', error);
      alert('Failed to reject claim. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_confirmation': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'under review': return 'bg-yellow-100 text-yellow-800';
      case 'rejected_by_manager': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasRole([SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN])) {
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
          <h1 className="text-2xl font-bold text-slate-900">Expense Claim Confirmation</h1>
          <p className="text-slate-600 mt-1">Review expense claims approved by Payroll Specialists</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-slate-700">Status:</label>
          <div className="flex space-x-2">
            {['all', 'pending_confirmation', 'under review', 'confirmed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'all' 
                  ? 'All' 
                  : status === 'pending_confirmation'
                  ? 'Pending'
                  : status === 'under review'
                  ? 'Under Review'
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Pending Confirmations</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Specialist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
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
                      {claim.specialistName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(claim.priority)}`}>
                        {claim.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>
                        {claim.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {claim.status === 'pending_confirmation' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedClaim(claim);
                                setShowConfirmModal(true);
                              }}
                              className="text-green-600 hover:text-green-800"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClaim(claim);
                                setShowConfirmModal(true);
                              }}
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
            {claims.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No claims pending confirmation
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Details Modal */}
      {selectedClaim && !showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Claim Details</h3>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Employee</label>
                  <p className="text-slate-900">{selectedClaim.employeeName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Specialist</label>
                  <p className="text-slate-900">{selectedClaim.specialistName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Claim Type</label>
                  <p className="text-slate-900">{selectedClaim.claimType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Amount</label>
                  <p className="text-slate-900">${selectedClaim.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Approved Amount</label>
                  <p className="text-slate-900">${selectedClaim.approvedAmount?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Priority</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedClaim.priority)}`}>
                    {selectedClaim.priority}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Description</label>
                <p className="text-slate-900 mt-1">{selectedClaim.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Specialist Review Notes</label>
                <p className="text-slate-900 mt-1">{selectedClaim.specialistNotes || 'No notes provided'}</p>
              </div>
              {selectedClaim.status === 'pending_confirmation' && (
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowConfirmModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Confirm Claim Approval</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Claim</label>
                <p className="text-slate-900">{selectedClaim.claimType}: {selectedClaim.description}</p>
                <p className="text-sm text-slate-600">{selectedClaim.employeeName}</p>
                <p className="text-sm text-slate-600">Amount: ${selectedClaim.amount.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Reviewed by: {selectedClaim.specialistName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmation Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add your confirmation notes..."
                  value={confirmationNotes}
                  onChange={(e) => setConfirmationNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectClaim}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={handleConfirmClaim}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
