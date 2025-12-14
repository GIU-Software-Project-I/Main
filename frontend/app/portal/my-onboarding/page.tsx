'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  onboardingService,
  Onboarding,
  OnboardingProgress,
  OnboardingTaskStatus,
  Document,
  PendingTasksResponse,
} from '@/app/services/onboarding';
import { useAuth } from '@/app/context/AuthContext';

const ONBOARDING_PHASES = [
  { id: 1, name: 'Setup & Checklist', description: 'Your onboarding checklist has been created' },
  { id: 2, name: 'Profile Creation', description: 'Your employee profile is being set up' },
  { id: 3, name: 'Document Collection', description: 'Upload required compliance documents' },
  { id: 4, name: 'Resource Provisioning', description: 'Equipment and workspace allocation' },
  { id: 5, name: 'System Access', description: 'Email, SSO, and system access setup' },
  { id: 6, name: 'Payroll & Benefits', description: 'Payroll and benefits enrollment' },
  { id: 7, name: 'Completion', description: 'Welcome to the team!' },
];

export default function MyOnboardingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTasksResponse | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [noOnboarding, setNoOnboarding] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoOnboarding(false);

      const employeeId = user?.id;
      if (!employeeId) {
        setNoOnboarding(true);
        return;
      }

      const onboardingData = await onboardingService.getOnboardingByEmployeeId(employeeId);
      setOnboarding(onboardingData);

      const [progressData, tasksData, docsData] = await Promise.all([
        onboardingService.getOnboardingProgress(onboardingData._id).catch(() => null),
        onboardingService.getPendingTasks(employeeId).catch(() => null),
        onboardingService.getDocumentsByOwner(employeeId).catch(() => []),
      ]);

      setProgress(progressData);
      setPendingTasks(tasksData);
      setDocuments(Array.isArray(docsData) ? docsData : []);
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setNoOnboarding(true);
      } else {
        setError(err.message || 'Failed to fetch onboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskName: string, status: OnboardingTaskStatus) => {
    if (!onboarding) return;

    try {
      setUpdatingTask(taskName);
      setError(null);
      await onboardingService.updateTaskStatus(onboarding._id, taskName, {
        status,
        completedAt: status === OnboardingTaskStatus.COMPLETED ? new Date().toISOString() : undefined,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    } finally {
      setUpdatingTask(null);
    }
  };

  const getCurrentPhase = () => {
    if (!progress) return 1;
    if (progress.isComplete) return 7;
    if (progress.progressPercentage >= 80) return 6;
    if (progress.progressPercentage >= 60) return 5;
    if (progress.progressPercentage >= 40) return 4;
    if (progress.progressPercentage >= 20) return 3;
    if (progress.progressPercentage > 0) return 2;
    return 1;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  // No active onboarding - show message
  if (noOnboarding || !onboarding) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Active Onboarding</h1>
          <p className="text-gray-600 mb-6">
            You don't have an active onboarding process. This page is only available for new employees who are going through the onboarding process.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentPhase = getCurrentPhase();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Onboarding</h1>
        <p className="text-gray-600 mt-1">Track your onboarding progress and complete required tasks (ONB-004, ONB-005)</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Progress</h2>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            onboarding.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {onboarding.completed ? 'Completed' : 'In Progress'}
          </span>
        </div>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-600">Overall Progress</span>
          <span className="font-medium">{progress?.progressPercentage || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              onboarding.completed ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress?.progressPercentage || 0}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {progress?.completedTasks || 0} of {progress?.totalTasks || 0} tasks completed
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Onboarding Timeline</h2>
        <div className="space-y-4">
          {ONBOARDING_PHASES.map((phase) => {
            const isCompleted = phase.id < currentPhase;
            const isCurrent = phase.id === currentPhase;
            return (
              <div key={phase.id} className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : phase.id}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-500'}`}>
                    {phase.name}
                  </p>
                  <p className={`text-sm ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-400'}`}>
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overdue Tasks Alert */}
      {pendingTasks && pendingTasks.overdueTasks && pendingTasks.overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 className="font-medium text-red-900">Overdue Tasks</h3>
          <p className="text-sm text-red-700 mt-1">
            You have {pendingTasks.overdueTasks.length} overdue task(s). Please complete them as soon as possible.
          </p>
        </div>
      )}

      {/* Task List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Your Tasks</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {!onboarding.tasks || onboarding.tasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No tasks assigned yet</div>
          ) : (
            onboarding.tasks.map((task, index) => {
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== OnboardingTaskStatus.COMPLETED;
              return (
                <div
                  key={index}
                  className={`p-4 ${
                    task.status === OnboardingTaskStatus.COMPLETED
                      ? 'bg-green-50'
                      : isOverdue
                      ? 'bg-red-50'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{task.name}</h3>
                        {isOverdue && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Department: {task.department}</p>
                      {task.deadline && (
                        <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </p>
                      )}
                      {task.notes && <p className="text-sm text-gray-600 mt-2">{task.notes}</p>}
                    </div>
                    <div>
                      {task.status === OnboardingTaskStatus.COMPLETED ? (
                        <span className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 rounded-md">
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTaskUpdate(task.name, OnboardingTaskStatus.COMPLETED)}
                          disabled={updatingTask === task.name}
                          className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {updatingTask === task.name ? 'Updating...' : 'Mark Complete'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Your Documents (ONB-007)</h2>
          <p className="text-sm text-gray-500 mt-1">
            BR 7: Documents must be collected and verified before your first working day
          </p>
        </div>
        <div className="p-4">
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{doc.type?.toUpperCase() || 'Document'}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Uploaded
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h2>
        <p className="text-blue-800">
          If you have questions about your onboarding process or need assistance, please contact HR.
        </p>
      </div>
    </div>
  );
}

