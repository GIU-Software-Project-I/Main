'use client';

import { useState, useEffect } from 'react';
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

export default function OnboardingDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTasksResponse | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const employeeId = user?.id;

      if (!employeeId) {
        setError('Unable to determine employee ID');
        return;
      }

      const onboardingData = await onboardingService.getOnboardingByEmployeeId(employeeId);
      setOnboarding(onboardingData);

      const [progressData, tasksData, docsData] = await Promise.all([
        onboardingService.getOnboardingProgress(onboardingData._id),
        onboardingService.getPendingTasks(employeeId),
        onboardingService.getDocumentsByOwner(employeeId),
      ]);

      setProgress(progressData);
      setPendingTasks(tasksData);
      setDocuments(docsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch onboarding data');
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome!</h1>
            <p className="text-gray-600">
              Your onboarding process has not been initiated yet. Please contact HR if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentPhase = getCurrentPhase();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Dashboard</h1>
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

        {/* Pending Tasks Alert */}
        {pendingTasks && pendingTasks.overdueTasks.length > 0 && (
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
            {onboarding.tasks.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No tasks assigned</div>
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
            <h2 className="text-lg font-semibold">Your Documents</h2>
            <p className="text-sm text-gray-500 mt-1">
              Per BR 7: Documents must be collected and verified before your first working day (ONB-007)
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
                      <p className="font-medium text-gray-900">{doc.type.toUpperCase()}</p>
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
          <p className="text-sm text-blue-700 mt-2">
            Per BR 12: Reminders and task assignments are tracked and delivered to ensure you don&apos;t miss important steps.
          </p>
        </div>
      </div>
    </div>
  );
}

