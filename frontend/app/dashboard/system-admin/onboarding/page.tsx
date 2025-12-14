'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { offboardingService, TerminationRequest, TerminationStatus } from '@/app/services/offboarding';

export default function SystemAdminOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');

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
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setOnboardings([]);
    } finally {
      setLoading(false);
    }
  };

  const getITTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.filter(t => t.department === 'IT') || [];
  };

  const hasITPendingTasks = (onboarding: Onboarding) => {
    return getITTasks(onboarding).some(t => t.status !== OnboardingTaskStatus.COMPLETED);
  };

  const filteredOnboardings = onboardings.filter(o => {
    if (filterStatus === 'pending') return !o.completed && hasITPendingTasks(o);
    if (filterStatus === 'completed') return o.completed || !hasITPendingTasks(o);
    return true;
  });

  const handleProvisionAccess = async (onboarding: Onboarding) => {
    const employeeId = typeof onboarding.employeeId === 'object'
      ? (onboarding.employeeId as any)?._id
      : onboarding.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    try {
      setProcessing(onboarding._id);
      setError(null);
      setSuccess(null);

      await onboardingService.provisionSystemAccess({
        employeeId,
      });

      // Mark IT tasks as completed
      const itTasks = getITTasks(onboarding);
      for (const task of itTasks) {
        if (task.status !== OnboardingTaskStatus.COMPLETED) {
          await onboardingService.updateTaskStatus(onboarding._id, task.name, {
            status: OnboardingTaskStatus.COMPLETED,
            completedAt: new Date().toISOString(),
          });
        }
      }

      setSuccess(`System access provisioned successfully for employee ${employeeId}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to provision access');
    } finally {
      setProcessing(null);
    }
  };

  const handleScheduleRevocation = async (onboarding: Onboarding) => {
    const employeeId = typeof onboarding.employeeId === 'object'
      ? (onboarding.employeeId as any)?._id
      : onboarding.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    const revocationDate = prompt('Enter scheduled revocation date (YYYY-MM-DD):');
    if (!revocationDate) return;

    try {
      setProcessing(onboarding._id);
      setError(null);
      setSuccess(null);

      await onboardingService.scheduleAccessRevocation({
        employeeId,
        revocationDate,
      });

      setSuccess(`Access revocation scheduled for ${revocationDate}`);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule revocation');
    } finally {
      setProcessing(null);
    }
  };

  const stats = {
    total: onboardings.length,
    pendingIT: onboardings.filter(o => !o.completed && hasITPendingTasks(o)).length,
    completedIT: onboardings.filter(o => o.completed || !hasITPendingTasks(o)).length,
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Access Provisioning</h1>
          <p className="text-gray-600 mt-1">Provision system access for new employees (ONB-009)</p>
        </div>
        <Link
          href="/dashboard/system-admin/offboarding"
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
        >
          Access Revocation
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Onboardings</p>
          <p className="text-2xl font-semibold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Pending IT Setup</p>
          <p className="text-2xl font-semibold mt-1 text-orange-600">{stats.pendingIT}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">IT Setup Complete</p>
          <p className="text-2xl font-semibold mt-1 text-green-600">{stats.completedIT}</p>
        </div>
      </div>

      {/* Business Rules */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900">Business Rules</h3>
        <ul className="mt-2 text-sm text-blue-800 space-y-1">
          <li><strong>BR 9(b):</strong> Auto onboarding tasks are generated for IT (allocation of email, laptop, system access)</li>
          <li><strong>ONB-009:</strong> Provision system access (payroll, email, internal systems) so the employee can work</li>
          <li><strong>ONB-013:</strong> Automated account provisioning on start date and scheduled revocation on exit</li>
        </ul>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            filterStatus === 'pending' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending IT Setup ({stats.pendingIT})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          IT Complete ({stats.completedIT})
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({stats.total})
        </button>
      </div>

      {/* Onboarding List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Employee System Access</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredOnboardings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No onboardings found matching the filter.</p>
            </div>
          ) : (
            filteredOnboardings.map((onboarding) => {
              const employeeIdDisplay = typeof onboarding.employeeId === 'object'
                ? (onboarding.employeeId as any)?._id || (onboarding.employeeId as any)?.firstName || 'Unknown'
                : onboarding.employeeId;
              const itTasks = getITTasks(onboarding);
              const hasPending = hasITPendingTasks(onboarding);

              return (
                <div key={onboarding._id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">Employee: {employeeIdDisplay}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          hasPending ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {hasPending ? 'Pending IT Setup' : 'IT Complete'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Started: {new Date(onboarding.createdAt).toLocaleDateString()}
                      </p>

                      {/* IT Tasks */}
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">IT Tasks:</p>
                        <div className="space-y-1">
                          {itTasks.length === 0 ? (
                            <p className="text-sm text-gray-500">No IT tasks assigned</p>
                          ) : (
                            itTasks.map((task, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  task.status === OnboardingTaskStatus.COMPLETED 
                                    ? 'bg-green-500' 
                                    : task.status === OnboardingTaskStatus.IN_PROGRESS
                                    ? 'bg-blue-500'
                                    : 'bg-yellow-500'
                                }`}></span>
                                <span className="text-gray-700">{task.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  task.status === OnboardingTaskStatus.COMPLETED 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {task.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {hasPending && (
                        <button
                          onClick={() => handleProvisionAccess(onboarding)}
                          disabled={processing === onboarding._id}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {processing === onboarding._id ? 'Processing...' : 'Provision Access'}
                        </button>
                      )}
                      <button
                        onClick={() => handleScheduleRevocation(onboarding)}
                        disabled={processing === onboarding._id}
                        className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Schedule Revocation
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Access Types */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">System Access Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Email</h3>
            <p className="text-xs text-gray-500 mt-1">Corporate email</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">SSO</h3>
            <p className="text-xs text-gray-500 mt-1">Single Sign-On</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Internal Systems</h3>
            <p className="text-xs text-gray-500 mt-1">HR, Time, etc.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Payroll</h3>
            <p className="text-xs text-gray-500 mt-1">Payroll access</p>
          </div>
        </div>
      </div>
    </div>
  );
}

