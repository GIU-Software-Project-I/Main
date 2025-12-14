'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { employeeProfileService } from '@/app/services/employee-profile';
import { performanceService } from '@/app/services/performance';

export default function HRManagerPage() {
  const { user } = useAuth();
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [cycleCount, setCycleCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [employeesRes, cyclesRes] = await Promise.all([
          employeeProfileService.getAllEmployees(1, 1),
          performanceService.getCycles(),
        ]);

        if (employeesRes.error) {
          setError(employeesRes.error);
          return;
        }

        let total = 0;
        if (typeof employeesRes.data === 'object' && employeesRes.data !== null && 'total' in employeesRes.data) {
          total = (employeesRes.data as any).total;
        } else if (Array.isArray(employeesRes.data)) {
          total = employeesRes.data.length;
        }
        setEmployeeCount(total);

        const cycles = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
        setCycleCount(cycles.filter((c: any) => c.status === 'ACTIVE').length);
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
      description: 'View and manage employee profiles, search directory',
      href: '/dashboard/hr-manager/employee-management',
    },
    {
      title: 'Organization',
      description: 'View departments and organizational structure',
      href: '/dashboard/hr-manager/organization',
    },
    {
      title: 'Performance Templates',
      description: 'Configure appraisal templates and rating scales',
      href: '/dashboard/hr-manager/performance-templates',
    },
    {
      title: 'Performance Cycles',
      description: 'Manage appraisal cycles and schedules',
      href: '/dashboard/hr-manager/performance-cycles',
    },
    {
      title: 'Dispute Resolution',
      description: 'Review and resolve performance rating disputes',
      href: '/dashboard/hr-manager/disputes',
    },
    {
      title: 'Recruitment',
      description: 'Manage job postings and candidates',
      href: '/dashboard/hr-manager/recruitment',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">HR Management Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back, {user?.firstName || 'Manager'}</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Export Report
            </button>
            <Link href="/dashboard/hr-manager/employee-management">
              <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
                Manage Employees
              </button>
            </Link>
          </div>
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
            <p className="text-sm font-medium text-slate-500">Active Cycles</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">
              {loading ? '-' : cycleCount ?? '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">HR Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => (
            <Link key={index} href={module.href}>
              <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer h-full">
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

