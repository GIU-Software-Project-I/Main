'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { employeeProfileService } from '@/app/services/employee-profile';

export default function HRAdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingRequests: 0,
    activeEmployees: 0,
    terminatedThisMonth: 0,
  });
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [employeesRes, pendingRes, statusRes] = await Promise.all([
          employeeProfileService.getAllEmployees(1, 1),
          employeeProfileService.getPendingChangeRequestsCount(),
          employeeProfileService.getEmployeeCountByStatus(),
        ]);

        // Parse employees count
        let total = 0;
        if (Array.isArray(employeesRes.data)) {
          total = employeesRes.data.length;
        } else if (employeesRes.data && typeof employeesRes.data === 'object') {
          total = (employeesRes.data as any).total || (employeesRes.data as any).data?.length || 0;
        }

        // Parse pending count
        let pending = 0;
        if (typeof pendingRes.data === 'number') {
          pending = pendingRes.data;
        } else if (pendingRes.data && typeof pendingRes.data === 'object') {
          pending = (pendingRes.data as any).count ?? 0;
        }

        // Parse status stats
        const statuses = statusRes.data as Record<string, number> || {};
        setStatusStats(statuses);

        setStats({
          totalEmployees: total,
          pendingRequests: pending,
          activeEmployees: statuses['ACTIVE'] || 0,
          terminatedThisMonth: statuses['TERMINATED'] || 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const quickActions = [
    {
      title: 'Employee Management',
      description: 'View and edit employee profiles, manage status',
      href: '/dashboard/hr-admin/employee-management',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      userStory: 'US-EP-04, US-EP-05',
    },
    {
      title: 'Change Requests',
      description: 'Review and approve profile change requests',
      href: '/dashboard/hr-admin/change-requests',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      color: 'from-amber-500 to-amber-600',
      badge: stats.pendingRequests > 0 ? stats.pendingRequests : undefined,
      userStory: 'US-E2-03',
    },
    {
      title: 'Role Assignment',
      description: 'Manage user roles and access permissions',
      href: '/dashboard/hr-admin/role-assignment',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      color: 'from-violet-500 to-purple-600',
      userStory: 'US-E7-05',
    },
    {
      title: 'Leave Configuration',
      description: 'Configure leave policies, types, and settings',
      href: '/dashboard/hr-admin/leaves-config',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-green-500 to-emerald-600',
      userStory: 'Leave Config',
    },
  ];

  const statCards = [
    {
      label: 'Total Employees',
      value: stats.totalEmployees,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'blue',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'amber',
      href: '/dashboard/hr-admin/change-requests',
    },
    {
      label: 'Active Employees',
      value: stats.activeEmployees,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green',
    },
    {
      label: 'Terminated',
      value: stats.terminatedThisMonth,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      color: 'red',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  };

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              HR Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.firstName || 'Admin'}. Manage employee data and system access.
            </p>
          </div>
          <Link
            href="/portal/my-profile"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => {
            const colors = colorClasses[stat.color];
            const Wrapper = stat.href ? Link : 'div';

            return (
              <Wrapper
                key={idx}
                href={stat.href || ''}
                className={`bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow ${stat.href ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {loading ? (
                        <span className="inline-block w-12 h-8 bg-muted animate-pulse rounded"></span>
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                    <div className={colors.text}>{stat.icon}</div>
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                href={action.href}
                className="group bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      {action.badge && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                    <p className="text-xs text-primary/70 mt-2">{action.userStory}</p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Employee Status Distribution</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(statusStats).map(([status, count]) => (
                <div key={status} className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {status.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Rules Reference */}
        <div className="bg-muted/50 border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Business Rules Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs px-1.5 py-0.5 bg-primary/10 rounded">BR 20a</span>
              <span className="text-muted-foreground">Only authorized roles can create/modify data</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs px-1.5 py-0.5 bg-primary/10 rounded">BR 3j</span>
              <span className="text-muted-foreground">Employee status controls system access</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs px-1.5 py-0.5 bg-primary/10 rounded">BR 22</span>
              <span className="text-muted-foreground">All changes logged with timestamp trail</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs px-1.5 py-0.5 bg-primary/10 rounded">BR 36</span>
              <span className="text-muted-foreground">Changes require workflow approval</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

