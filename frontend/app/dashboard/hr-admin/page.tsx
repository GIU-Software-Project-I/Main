'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { employeeProfileService } from '@/app/services/employee-profile';

export default function HRAdminPage() {
  const { user } = useAuth();
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [employeesRes, pendingRes] = await Promise.all([
          employeeProfileService.getAllEmployees(1, 1),
          employeeProfileService.getPendingChangeRequestsCount(),
        ]);

        if (employeesRes.error) {
          setError(employeesRes.error);
          return;
        }

        // Handle different response formats
        let employeesData: any[] = [];
        if (Array.isArray(employeesRes.data)) {
          employeesData = employeesRes.data;
        } else if (employeesRes.data && typeof employeesRes.data === 'object' && Array.isArray((employeesRes.data as any).data)) {
          employeesData = (employeesRes.data as any).data;
        }
        const total = employeesData.length;
        setEmployeeCount(total);

        let pendingCount = 0;
        if (typeof pendingRes.data === 'number') {
          pendingCount = pendingRes.data;
        } else if (pendingRes.data && typeof pendingRes.data === 'object') {
          pendingCount = (pendingRes.data as any).count ?? (pendingRes.data as any).pendingCount ?? 0;
        }
        setPendingCount(pendingCount);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const modules = [
    {
      title: 'Employee Management',
      description: 'Manage all employee profiles and records',
      href: '/dashboard/hr-admin/employee-management',
    },
    {
      title: 'Change Requests',
      description: 'Review and approve pending changes',
      href: '/dashboard/hr-admin/change-requests',
      hasBadge: pendingCount && pendingCount > 0,
    },
    {
      title: 'Role Assignment',
      description: 'Manage user roles and permissions',
      href: '/dashboard/hr-admin/role-assignment',
    },
    {
      title: 'Reports',
      description: 'View HR analytics and reports',
      href: '/dashboard/hr-admin/reports',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">HR Administration</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back, {user?.firstName || 'Admin'}</p>
          </div>
          <Link href="/dashboard/hr-admin/employee-management">
            <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
              Manage Employees
            </button>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">Unable to load data</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div>
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-sm font-medium text-slate-500">Total Employees</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">
              {loading ? '-' : employeeCount ?? '-'}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-sm font-medium text-slate-500">Pending Requests</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">
              {loading ? '-' : pendingCount ?? '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <Link key={index} href={module.href}>
              <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer h-full relative">
                {module.hasBadge && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">{module.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{module.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

