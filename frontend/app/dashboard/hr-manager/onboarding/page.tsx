'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';

export default function OnboardingDashboard() {
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
      (acc, o) => acc + (o.tasks?.filter((t) => t.status === OnboardingTaskStatus.PENDING).length || 0),
      0
    ),
  };

  const calculateProgress = (tasks: Onboarding['tasks']) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-card rounded-xl border border-border"></div>
              ))}
            </div>
            <div className="h-96 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Onboarding Management</h1>
            <p className="text-muted-foreground mt-1">Manage new hire onboarding processes and task checklists</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/hr-manager/onboarding/employee"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create Employee
            </Link>
            <Link
              href="/dashboard/hr-manager/onboarding/checklists"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Manage Checklists
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="font-medium hover:underline">Retry</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Onboardings</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-5 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-5 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-5 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.pendingTasks}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/hr-manager/onboarding/checklists"
            className="group bg-card p-5 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all font-medium"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">Checklists</h3>
                <p className="text-xs text-muted-foreground mt-1">Create and manage checklists</p>
              </div>
            </div>
          </Link>
          <Link
            href="/dashboard/hr-manager/onboarding/employee"
            className="group bg-card p-5 rounded-xl border border-border hover:border-green-500/30 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Profile Creation</h3>
                <p className="text-xs text-muted-foreground mt-1">Create from signed contracts</p>
              </div>
            </div>
          </Link>
          <Link
            href="/dashboard/hr-manager/onboarding/payroll"
            className="group bg-card p-5 rounded-xl border border-border hover:border-purple-500/30 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Payroll Setup</h3>
                <p className="text-xs text-muted-foreground mt-1">Initiate payroll and bonuses</p>
              </div>
            </div>
          </Link>
          <div className="bg-card p-5 rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Reminders</h3>
                <p className="text-xs text-muted-foreground mt-1">Send batch reminders</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All', value: 'all' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Completed', value: 'completed' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterStatus === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground hover:bg-accent'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Onboarding List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              Active Onboardings
              <span className="ml-2 text-muted-foreground font-normal">({filteredOnboardings.length})</span>
            </h2>
          </div>

          <div className="divide-y divide-border">
            {filteredOnboardings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">No onboardings found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create an onboarding checklist to get started
                </p>
              </div>
            ) : (
              filteredOnboardings.map((onboarding) => {
                const progress = calculateProgress(onboarding.tasks);
                const employee = typeof onboarding.employeeId === 'object' ? onboarding.employeeId as any : null;
                const employeeName = employee
                  ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Hire'
                  : 'New Hire';

                return (
                  <Link
                    key={onboarding._id}
                    href={`/dashboard/hr-manager/onboarding/checklists/${onboarding._id}`}
                    className="block px-6 py-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${onboarding.completed
                            ? 'bg-green-500/10'
                            : 'bg-primary/10'
                          }`}>
                          {onboarding.completed ? (
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-foreground truncate">{employeeName}</h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${onboarding.completed
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-primary/10 text-primary'
                              }`}>
                              {onboarding.completed ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 max-w-xs">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${getProgressColor(progress)}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground w-10">{progress}%</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {onboarding.tasks?.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length || 0}/
                              {onboarding.tasks?.length || 0} tasks
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-muted-foreground">
                          {new Date(onboarding.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

