'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getApplications,
  getJobs,
  updateApplicationStage,
  updateApplicationStatus,
  rejectApplication,
  assignHrToApplication,
} from '@/app/services/recruitment';
import { Application, JobRequisition } from '@/app/types/recruitment';
import { ApplicationStage, ApplicationStatus } from '@/app/types/enums';

// REC-008: Track candidates through each stage of the hiring process
// This page allows HR to view, filter, and manage all job applications

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [stageFilter, setStageFilter] = useState<ApplicationStage | ''>('');
  const [jobFilter, setJobFilter] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [statusFilter, stageFilter, jobFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [appsData, jobsData] = await Promise.all([
        getApplications({
          ...(statusFilter && { status: statusFilter }),
          ...(stageFilter && { stage: stageFilter }),
          ...(jobFilter && { requisitionId: jobFilter }),
        }),
        getJobs(),
      ]);

      setApplications(appsData);
      setJobs(jobsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (appId: string, newStage: ApplicationStage) => {
    try {
      await updateApplicationStage(appId, newStage);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to update stage: ${err.message}`);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(appId, { status: newStatus });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleReject = async (appId: string) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      await rejectApplication(appId, reason || undefined);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to reject application: ${err.message}`);
    }
  };

  const handleViewDetails = (appId: string) => {
    router.push(`/dashboard/hr-manager/recruitment/applications/${appId}`);
  };

  const getStageLabel = (stage: ApplicationStage): string => {
    const labels: Record<ApplicationStage, string> = {
      [ApplicationStage.SCREENING]: 'Screening',
      [ApplicationStage.DEPARTMENT_INTERVIEW]: 'Department Interview',
      [ApplicationStage.HR_INTERVIEW]: 'HR Interview',
      [ApplicationStage.OFFER]: 'Offer',
    };
    return labels[stage] || stage;
  };

  const getStatusBadge = (status: ApplicationStatus): string => {
    const badges: Record<ApplicationStatus, string> = {
      [ApplicationStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [ApplicationStatus.IN_PROCESS]: 'bg-yellow-100 text-yellow-800',
      [ApplicationStatus.OFFER]: 'bg-purple-100 text-purple-800',
      [ApplicationStatus.HIRED]: 'bg-green-100 text-green-800',
      [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading applications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applications Management</h1>
        <div className="text-sm text-gray-500">
          {applications.length} application{applications.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value={ApplicationStatus.SUBMITTED}>Submitted</option>
              <option value={ApplicationStatus.IN_PROCESS}>In Process</option>
              <option value={ApplicationStatus.OFFER}>Offer</option>
              <option value={ApplicationStatus.HIRED}>Hired</option>
              <option value={ApplicationStatus.REJECTED}>Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as ApplicationStage | '')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Stages</option>
              <option value={ApplicationStage.SCREENING}>Screening</option>
              <option value={ApplicationStage.DEPARTMENT_INTERVIEW}>Department Interview</option>
              <option value={ApplicationStage.HR_INTERVIEW}>HR Interview</option>
              <option value={ApplicationStage.OFFER}>Offer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Position
            </label>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Positions</option>
              {jobs.map((job) => (
                <option key={job.id || job._id} value={job.id || job._id}>
                  {job.requisitionId} - {job.templateTitle || 'Untitled'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id || app._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {app.candidateName || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">{app.candidateEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.jobTitle || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{app.departmentName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getStageLabel(app.currentStage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetails(app.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {app.status !== ApplicationStatus.REJECTED &&
                        app.status !== ApplicationStatus.HIRED && (
                          <>
                            <button
                              onClick={() => {
                                const newStage = prompt(
                                  'Enter new stage (screening, department_interview, hr_interview, offer):'
                                );
                                if (newStage && Object.values(ApplicationStage).includes(newStage as ApplicationStage)) {
                                  handleStageChange(app.id, newStage as ApplicationStage);
                                }
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Move
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
