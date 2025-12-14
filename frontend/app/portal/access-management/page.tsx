'use client';

import { useState, useEffect } from 'react';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { offboardingService, TerminationRequest, TerminationStatus } from '@/app/services/offboarding';

type TabType = 'provisioning' | 'revocation';

const ACCESS_TYPES = [
  { id: 'email', name: 'Email', description: 'Corporate email account', icon: '📧' },
  { id: 'sso', name: 'SSO', description: 'Single Sign-On access', icon: '🔐' },
  { id: 'internal_systems', name: 'Internal Systems', description: 'HR, Time Management, etc.', icon: '💻' },
  { id: 'payroll', name: 'Payroll', description: 'Payroll system access', icon: '💰' },
];

export default function AccessManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('provisioning');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [terminations, setTerminations] = useState<TerminationRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'provisioning') {
        const result = await onboardingService.getAllOnboardings();
        const pending = Array.isArray(result)
          ? result.filter(o => !o.completed && hasITPendingTasks(o))
          : [];
        setOnboardings(pending);
      } else {
        const result = await offboardingService.getAllTerminationRequests();
        const approved = Array.isArray(result)
          ? result.filter(r => r.status === TerminationStatus.APPROVED)
          : [];
        setTerminations(approved);
      }
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setOnboardings([]);
      setTerminations([]);
    } finally {
      setLoading(false);
    }
  };

  const hasITPendingTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.some(t =>
      t.department === 'IT' && t.status !== OnboardingTaskStatus.COMPLETED
    ) || false;
  };

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
      const itTasks = onboarding.tasks?.filter(t => t.department === 'IT') || [];
      for (const task of itTasks) {
        if (task.status !== OnboardingTaskStatus.COMPLETED) {
          await onboardingService.updateTaskStatus(onboarding._id, task.name, {
            status: OnboardingTaskStatus.COMPLETED,
            completedAt: new Date().toISOString(),
          });
        }
      }

      setSuccess(`System access provisioned for employee ${employeeId}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to provision access');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevokeAccess = async (request: TerminationRequest) => {
    const employeeId = typeof request.employeeId === 'object'
      ? (request.employeeId as any)?._id
      : request.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    try {
      setProcessing(request._id);
      setError(null);
      setSuccess(null);

      await offboardingService.revokeSystemAccess({
        employeeId,
      });

      setSuccess(`System access revoked for employee ${employeeId}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setProcessing(null);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Access Management</h1>
        <p className="text-gray-600 mt-1">Provision and revoke system access for employees (ONB-009, OFF-007)</p>
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('provisioning')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'provisioning'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Access Provisioning (ONB-009)
            {onboardings.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                {onboardings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('revocation')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'revocation'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Access Revocation (OFF-007)
            {terminations.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                {terminations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Business Rules */}
      <div className={`p-4 rounded-lg ${activeTab === 'provisioning' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
        <h3 className={`font-medium ${activeTab === 'provisioning' ? 'text-blue-900' : 'text-red-900'}`}>
          {activeTab === 'provisioning' ? 'Provisioning Requirements' : 'Revocation Requirements'}
        </h3>
        <ul className={`mt-2 text-sm space-y-1 ${activeTab === 'provisioning' ? 'text-blue-800' : 'text-red-800'}`}>
          {activeTab === 'provisioning' ? (
            <>
              <li><strong>ONB-009:</strong> Provision system access (payroll, email, internal systems) so the employee can work</li>
              <li><strong>BR 9(b):</strong> Auto onboarding tasks are generated for IT (allocation of email, laptop, system access)</li>
            </>
          ) : (
            <>
              <li><strong>OFF-007:</strong> Revoke system and account access upon termination to maintain security</li>
              <li><strong>BR 3(c), BR 19:</strong> Access revocation is mandatory for security compliance</li>
            </>
          )}
        </ul>
      </div>

      {/* Access Types Reference */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Access Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACCESS_TYPES.map((access) => (
            <div key={access.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-lg">{access.icon}</span>
              <div>
                <p className="text-sm font-medium">{access.name}</p>
                <p className="text-xs text-gray-500">{access.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content based on tab */}
      {activeTab === 'provisioning' ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Pending Access Provisioning</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {onboardings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No employees pending access provisioning.</p>
              </div>
            ) : (
              onboardings.map((onboarding) => {
                const employeeIdDisplay = typeof onboarding.employeeId === 'object'
                  ? (onboarding.employeeId as any)?._id || 'Unknown'
                  : onboarding.employeeId;
                const itTasks = onboarding.tasks?.filter(t => t.department === 'IT') || [];

                return (
                  <div key={onboarding._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">Employee: {employeeIdDisplay}</h3>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Started: {new Date(onboarding.createdAt).toLocaleDateString()}
                        </p>
                        {itTasks.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {itTasks.map((task, idx) => (
                              <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                {task.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleProvisionAccess(onboarding)}
                        disabled={processing === onboarding._id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {processing === onboarding._id ? 'Provisioning...' : 'Provision All Access'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Pending Access Revocation</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {terminations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No employees pending access revocation.</p>
              </div>
            ) : (
              terminations.map((request) => {
                const employeeIdDisplay = typeof request.employeeId === 'object'
                  ? (request.employeeId as any)?._id || 'Unknown'
                  : request.employeeId;
                const reasonDisplay = typeof request.reason === 'object'
                  ? JSON.stringify(request.reason)
                  : request.reason;

                return (
                  <div key={request._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">Employee: {employeeIdDisplay}</h3>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Access Active
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Reason: {reasonDisplay}</p>
                        {request.terminationDate && (
                          <p className="text-sm text-gray-500">
                            Termination Date: {new Date(request.terminationDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRevokeAccess(request)}
                        disabled={processing === request._id}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {processing === request._id ? 'Revoking...' : 'Revoke All Access'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
