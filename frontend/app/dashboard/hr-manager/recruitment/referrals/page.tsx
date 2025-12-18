'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  getReferrals,
  createReferral,
  getCandidates,
  getJobs,
} from '@/app/services/recruitment';
import { Candidate, JobRequisition } from '@/app/types/recruitment';

// REC-030: Tag candidates as referrals for preferential filtering
// Employees can refer candidates, giving them higher priority

export default function ReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    candidateId: '',
    requisitionId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [referralsData, candidatesData, jobsData] = await Promise.all([
        getReferrals(),
        getCandidates(),
        getJobs({ status: 'published' }),
      ]);

      setReferrals(referralsData);
      setCandidates(candidatesData);
      setJobs(jobsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load referrals');
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert('User ID not found');
      return;
    }

    try {
      await createReferral({
        referrerId: user.id,
        candidateId: formData.candidateId,
        requisitionId: formData.requisitionId || undefined,
      });

      alert('Referral created successfully!');
      setShowCreateModal(false);
      setFormData({ candidateId: '', requisitionId: '' });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to create referral: ${err.message}`);
    }
  };

  const getCandidateName = (candidateId: string): string => {
    const candidate = candidates.find((c) => c.id === candidateId);
    return candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown';
  };

  const getJobTitle = (requisitionId?: string): string => {
    if (!requisitionId) return 'General';
    const job = jobs.find((j) => j.id === requisitionId);
    return job?.templateTitle || 'Unknown Position';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading referrals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button onClick={fetchData} className="mt-2 text-red-600 underline hover:text-red-800">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Referrals</h1>
          <p className="text-gray-600 mt-1">Candidates referred by employees get higher priority</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Referral
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Referrals</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{referrals.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Your Referrals</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {referrals.filter((r: any) => r.referrerId === user?.id || r.referringEmployeeId === user?.id).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Active Candidates</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{candidates.length}</div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referred By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No referrals found
                  </td>
                </tr>
              ) : (
                referrals.map((referral: any) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getCandidateName(referral.candidateId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getJobTitle(referral.requisitionId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Employee #{referral.referrerId || referral.referringEmployeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {referral.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create Referral</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate *
                </label>
                <select
                  required
                  value={formData.candidateId}
                  onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Candidate</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.firstName} {candidate.lastName} - {candidate.personalEmail}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position (Optional)
                </label>
                <select
                  value={formData.requisitionId}
                  onChange={(e) => setFormData({ ...formData, requisitionId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">General Referral (No specific position)</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.requisitionId} - {job.templateTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
                <strong>Note:</strong> Referred candidates receive priority in the screening process
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
