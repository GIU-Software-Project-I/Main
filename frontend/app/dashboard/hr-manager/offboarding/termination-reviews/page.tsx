'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
} from '@/app/services/offboarding';

export default function TerminationReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminations, setTerminations] = useState<TerminationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    contractId: '',
    reason: '',
    hrComments: '',
    terminationDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getTerminationRequestsByInitiator(TerminationInitiation.HR);
      const managerResults = await offboardingService.getTerminationRequestsByInitiator(TerminationInitiation.MANAGER);
      setTerminations([...result, ...managerResults]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch termination reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.contractId || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await offboardingService.createTerminationRequest({
        employeeId: formData.employeeId,
        contractId: formData.contractId,
        initiator: TerminationInitiation.HR,
        reason: formData.reason,
        hrComments: formData.hrComments || undefined,
        terminationDate: formData.terminationDate || undefined,
      });
      setFormData({ employeeId: '', contractId: '', reason: '', hrComments: '', terminationDate: '' });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create termination request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case TerminationStatus.UNDER_REVIEW:
        return 'bg-blue-100 text-blue-800';
      case TerminationStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case TerminationStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-gray-500 hover:text-gray-700">
              Offboarding
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Termination Reviews</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Termination Reviews</h1>
          <p className="text-gray-600 mt-1">Initiate and manage termination reviews based on performance (OFF-001)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
        >
          {showForm ? 'Cancel' : 'Initiate Termination'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Initiate Termination Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter employee ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contractId}
                  onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contract ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Termination Date
                </label>
                <input
                  type="date"
                  value={formData.terminationDate}
                  onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Termination <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Provide detailed reason for termination..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HR Comments
              </label>
              <textarea
                value={formData.hrComments}
                onChange={(e) => setFormData({ ...formData, hrComments: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Additional HR notes..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Termination Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">HR/Manager Initiated Terminations</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {terminations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No termination reviews found.</p>
            </div>
          ) : (
            terminations.map((termination) => (
              <Link
                key={termination._id}
                href={`/dashboard/hr-manager/offboarding/resignations/${termination._id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">Employee: {termination.employeeId}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(termination.status)}`}>
                        {termination.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {termination.initiator.toUpperCase()} Initiated
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Reason: {termination.reason}</p>
                    {termination.terminationDate && (
                      <p className="text-sm text-gray-500">
                        Effective Date: {new Date(termination.terminationDate).toLocaleDateString()}
                      </p>
                    )}
                    {termination.performanceWarnings && termination.performanceWarnings.length > 0 && (
                      <p className="text-sm text-orange-600 mt-1">
                        Performance warnings: {termination.performanceWarnings.length}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Created: {new Date(termination.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

