'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { useAuth } from '@/app/context/AuthContext';

export default function OnboardingDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('Failed to fetch onboarding data:', err);
      // Don't show error if it's just empty data or 404
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setOnboardings([]);
      } else {
        setError(err.message || 'Failed to fetch onboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOnboardings = onboardings.filter((onboarding) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return onboarding.completed;
    if (filterStatus === 'in_progress') return !onboarding.completed;
    return true;
  });

  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter((o) => !o.completed).length,
    completed: onboardings.filter((o) => o.completed).length,
    pendingTasks: onboardings.reduce(
      (acc, o) => acc + (o.tasks && Array.isArray(o.tasks) ? o.tasks.filter((t) => t.status === OnboardingTaskStatus.PENDING).length : 0),
      0
    ),
  };

  const calculateProgress = (tasks: Onboarding['tasks']) => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length;
    return Math.round((completed / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Management</h1>
          <p className="text-gray-600 mt-1">Manage new hire onboarding processes and task checklists</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/hr-manager/onboarding/checklists"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Manage Checklists
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button onClick={fetchData} className="ml-4 text-red-800 underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Onboardings</p>
          <p className="text-2xl font-semibold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="text-2xl font-semibold mt-1 text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-semibold mt-1 text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
          <p className="text-2xl font-semibold mt-1 text-orange-600">{stats.pendingTasks}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Onboarding Processes</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-sm rounded-md ${
                filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('in_progress')}
              className={`px-3 py-1.5 text-sm rounded-md ${
                filterStatus === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 text-sm rounded-md ${
                filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredOnboardings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No onboarding processes found.</p>
              <p className="text-sm mt-1">
                Onboarding checklists are created when a contract is signed and an employee profile is created.
              </p>
            </div>
          ) : (
            filteredOnboardings.map((onboarding) => {
              const progress = calculateProgress(onboarding.tasks);
              // Handle case where employeeId/contractId might be populated objects or strings
              const employeeIdDisplay = typeof onboarding.employeeId === 'object'
                ? (onboarding.employeeId as any)?._id || JSON.stringify(onboarding.employeeId)
                : onboarding.employeeId;
              const contractIdDisplay = typeof onboarding.contractId === 'object'
                ? (onboarding.contractId as any)?._id || JSON.stringify(onboarding.contractId)
                : onboarding.contractId;
              return (
                <Link
                  key={onboarding._id}
                  href={`/dashboard/hr-manager/onboarding/employee/${onboarding._id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">
                          Employee: {employeeIdDisplay}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            onboarding.completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {onboarding.completed ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Contract: {contractIdDisplay}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(onboarding.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{progress}% Complete</p>
                      <p className="text-xs text-gray-500">
                        {onboarding.tasks && Array.isArray(onboarding.tasks) ? onboarding.tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length : 0} /{' '}
                        {onboarding.tasks?.length || 0} tasks
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          onboarding.completed ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/hr-manager/onboarding/checklists"
          className="bg-white p-5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">Checklist Templates</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage onboarding task checklists for new hires (ONB-001)
          </p>
        </Link>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900">Payroll Integration</h3>
          <p className="text-sm text-gray-500 mt-1">
            Automatic payroll initiation on contract signing (ONB-018)
          </p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900">System Access</h3>
          <p className="text-sm text-gray-500 mt-1">
            Automated account provisioning and scheduled revocation (ONB-013)
          </p>
        </div>
      </div>
    </div>
  );
}

