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
  { id: 1, name: 'Setup & Checklist', description: 'Your onboarding checklist has been created', icon: 'clipboard' },
  { id: 2, name: 'Profile Creation', description: 'Your employee profile is being set up', icon: 'user' },
  { id: 3, name: 'Document Collection', description: 'Upload required compliance documents', icon: 'file' },
  { id: 4, name: 'Resource Provisioning', description: 'Equipment and workspace allocation', icon: 'package' },
  { id: 5, name: 'System Access', description: 'Email, SSO, and system access setup', icon: 'key' },
  { id: 6, name: 'Payroll & Benefits', description: 'Payroll and benefits enrollment', icon: 'dollar' },
  { id: 7, name: 'Completion', description: 'Welcome to the team!', icon: 'check' },
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

  const renderPhaseIcon = (iconName: string, isActive: boolean, isCompleted: boolean) => {
    const iconClass = `w-5 h-5 ${isCompleted ? 'text-white' : isActive ? 'text-white' : 'text-gray-400'}`;

    switch (iconName) {
      case 'clipboard':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
      case 'user':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case 'file':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case 'package':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
      case 'key':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>;
      case 'dollar':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'check':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-48 bg-white rounded-xl shadow-sm"></div>
            <div className="h-64 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  if (noOnboarding || !onboarding) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 lg:p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">No Active Onboarding</h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              You don't have an active onboarding process. This page is available for new employees going through the onboarding process.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentPhase = getCurrentPhase();

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">My Onboarding</h1>
            <p className="text-gray-500 mt-1">Track your progress and complete required tasks</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            onboarding.completed 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${onboarding.completed ? 'bg-green-500' : 'bg-blue-500'}`}></span>
            {onboarding.completed ? 'Completed' : 'In Progress'}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Progress Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Overall Progress</h2>
              <p className="text-sm text-gray-500 mt-1">
                {progress?.completedTasks || 0} of {progress?.totalTasks || 0} tasks completed
              </p>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {progress?.progressPercentage || 0}%
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                onboarding.completed ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress?.progressPercentage || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Onboarding Timeline</h2>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div
              className="absolute left-5 top-0 w-0.5 bg-blue-500 transition-all duration-500"
              style={{ height: `${((currentPhase - 1) / (ONBOARDING_PHASES.length - 1)) * 100}%` }}
            ></div>

            <div className="space-y-6">
              {ONBOARDING_PHASES.map((phase) => {
                const isCompleted = phase.id < currentPhase;
                const isCurrent = phase.id === currentPhase;

                return (
                  <div key={phase.id} className="flex items-start gap-4 relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                        isCompleted
                          ? 'bg-green-500'
                          : isCurrent
                          ? 'bg-blue-500 ring-4 ring-blue-100'
                          : 'bg-gray-200'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        renderPhaseIcon(phase.icon, isCurrent, isCompleted)
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`font-medium ${
                        isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-400'
                      }`}>
                        {phase.name}
                      </p>
                      <p className={`text-sm mt-0.5 ${
                        isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {phase.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Overdue Tasks Alert */}
        {pendingTasks?.overdueTasks && pendingTasks.overdueTasks.length > 0 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-red-900">Attention Required</h3>
              <p className="text-sm text-red-700 mt-1">
                You have {pendingTasks.overdueTasks.length} overdue task{pendingTasks.overdueTasks.length > 1 ? 's' : ''}. Please complete them as soon as possible.
              </p>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Your Tasks</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {!onboarding.tasks || onboarding.tasks.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500">No tasks assigned yet</p>
              </div>
            ) : (
              onboarding.tasks.map((task, index) => {
                const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== OnboardingTaskStatus.COMPLETED;
                const isCompleted = task.status === OnboardingTaskStatus.COMPLETED;

                return (
                  <div
                    key={index}
                    className={`p-4 sm:p-5 transition-colors ${
                      isCompleted ? 'bg-green-50/50' : isOverdue ? 'bg-red-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted ? 'bg-green-100' : isOverdue ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {isCompleted ? (
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900">{task.name}</h3>
                            {isOverdue && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {task.department}
                            </span>
                            {task.deadline && (
                              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Due: {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {task.notes && (
                            <p className="text-sm text-gray-600 mt-2">{task.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="sm:ml-auto">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-100 text-green-700 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTaskUpdate(task.name, OnboardingTaskStatus.COMPLETED)}
                            disabled={updatingTask === task.name}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {updatingTask === task.name ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Mark Complete
                              </>
                            )}
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

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Your Documents</h2>
              <p className="text-sm text-gray-500 mt-0.5">Upload compliance documents before your first day</p>
            </div>
            <Link
              href="/portal/candidate/document-upload"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Upload Documents
            </Link>
          </div>
          <div className="p-6">
            {documents.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No documents uploaded yet</p>
                <Link
                  href="/portal/candidate/document-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Documents
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{doc.type?.replace('_', ' ') || 'Document'}</p>
                        <p className="text-sm text-gray-500">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Uploaded
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Help */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Need Help?</h3>
              <p className="text-gray-600 mt-1">
                If you have questions about your onboarding process or need assistance with any tasks, please contact the HR department.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

