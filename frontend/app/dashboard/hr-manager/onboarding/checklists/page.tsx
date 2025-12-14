'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  onboardingService,
  Onboarding,
  OnboardingTaskStatus,
} from '@/app/services/onboarding';

const DEFAULT_TASK_TEMPLATES = [
  { name: 'Complete employee information form', department: 'HR' },
  { name: 'Setup email account', department: 'IT' },
  { name: 'Provision system access', department: 'IT' },
  { name: 'Allocate laptop/equipment', department: 'IT' },
  { name: 'Setup workspace/desk', department: 'Facilities' },
  { name: 'Issue access card', department: 'Facilities' },
  { name: 'Setup payroll', department: 'Finance' },
  { name: 'Benefits enrollment', department: 'HR' },
  { name: 'Complete tax forms', department: 'Finance' },
  { name: 'Orientation session', department: 'HR' },
  { name: 'Meet team members', department: 'Department' },
  { name: 'Review company policies', department: 'HR' },
];

export default function OnboardingChecklistsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    contractId: '',
    tasks: [...DEFAULT_TASK_TEMPLATES],
  });
  const [newTask, setNewTask] = useState({ name: '', department: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.contractId || formData.tasks.length === 0) {
      setError('Please fill in employee ID, contract ID, and at least one task');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const tasksWithDeadlines = formData.tasks.map((task, index) => ({
        ...task,
        deadline: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week per task
      }));

      await onboardingService.createOnboarding({
        employeeId: formData.employeeId,
        contractId: formData.contractId,
        tasks: tasksWithDeadlines,
      });

      setFormData({
        employeeId: '',
        contractId: '',
        tasks: [...DEFAULT_TASK_TEMPLATES],
      });
      setShowCreateForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.department) return;
    setFormData({
      ...formData,
      tasks: [...formData.tasks, newTask],
    });
    setNewTask({ name: '', department: '' });
  };

  const handleRemoveTask = (index: number) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index),
    });
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
            <Link href="/dashboard/hr-manager/onboarding" className="text-gray-500 hover:text-gray-700">
              Onboarding
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Checklists</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Onboarding Checklists</h1>
          <p className="text-gray-600 mt-1">Create and manage onboarding task checklists (ONB-001)</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
        >
          {showCreateForm ? 'Cancel' : 'Create Onboarding'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Onboarding Checklist</h2>
          <form onSubmit={handleCreateOnboarding} className="space-y-4">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tasks</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="flex-1 text-sm">{task.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{task.department}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Task name"
                />
                <select
                  value={newTask.department}
                  onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Department</option>
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Finance">Finance</option>
                  <option value="Facilities">Facilities</option>
                  <option value="Department">Department</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Add Task
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Onboarding'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
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
          <h2 className="text-lg font-semibold">All Onboarding Checklists</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {onboardings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No onboarding checklists found.</p>
              <p className="text-sm mt-1">Create one by clicking the button above.</p>
            </div>
          ) : (
            onboardings.map((onboarding) => {
              const progress = calculateProgress(onboarding.tasks);
              // Handle case where employeeId/contractId might be populated objects or strings
              const employeeIdDisplay = typeof onboarding.employeeId === 'object'
                ? (onboarding.employeeId as any)?._id || 'Unknown'
                : onboarding.employeeId;
              const contractIdDisplay = typeof onboarding.contractId === 'object'
                ? (onboarding.contractId as any)?._id || 'Unknown'
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
                        <h3 className="font-medium text-gray-900">Employee: {employeeIdDisplay}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            onboarding.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {onboarding.completed ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Contract: {contractIdDisplay}</p>
                      <p className="text-sm text-gray-500">Tasks: {onboarding.tasks?.length || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{progress}%</p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${onboarding.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Business Rules Reference */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Business Rules Reference</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li><strong>BR 8, BR 11:</strong> Onboarding checklists should be customizable with department-specific tasks</li>
          <li><strong>BR 9(a):</strong> Auto tasks for HR - payroll and benefits creation</li>
          <li><strong>BR 9(b):</strong> Auto tasks for IT - email, laptop, system access allocation</li>
          <li><strong>BR 9(c):</strong> Auto tasks for Admin - workspace and ID badge allocation</li>
          <li><strong>BR 11(a, b):</strong> Orientation program with onboarding workflow and department-specific training</li>
        </ul>
      </div>
    </div>
  );
}

