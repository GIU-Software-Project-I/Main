'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/app/components/ui/card';
import { getRecruitmentDashboard } from '@/app/services/recruitment';

// Interface matching backend getRecruitmentDashboard response
interface DashboardResponse {
  totalOpenPositions: number;
  totalApplications: number;
  applicationsByStage: { _id: string; count: number }[];
  applicationsByStatus: { _id: string; count: number }[];
  recentApplications: unknown[];
}

interface RecruitmentStats {
  openJobs: number;
  activeCandidates: number;
  pendingOffers: number;
  hiredThisMonth: number;
}

export default function RecruitmentOverviewPage() {
  const [stats, setStats] = useState<RecruitmentStats>({
    openJobs: 0,
    activeCandidates: 0,
    pendingOffers: 0,
    hiredThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dashboardData = await getRecruitmentDashboard() as DashboardResponse;
      
      // Extract stats from backend response
      const activeCandidates = dashboardData?.applicationsByStatus
        ?.filter(s => s._id !== 'rejected' && s._id !== 'hired')
        .reduce((sum, s) => sum + s.count, 0) || 0;
      
      const hiredCount = dashboardData?.applicationsByStatus
        ?.find(s => s._id === 'hired')?.count || 0;
      
      const pendingOffers = dashboardData?.applicationsByStage
        ?.find(s => s._id === 'offer')?.count || 0;
      
      setStats({
        openJobs: dashboardData?.totalOpenPositions || 0,
        activeCandidates: activeCandidates,
        pendingOffers: pendingOffers,
        hiredThisMonth: hiredCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recruitment stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const modules = [
    {
      title: 'Job Requisitions',
      description: 'Create, manage, publish and close job postings',
      href: '/dashboard/hr-manager/recruitment/jobs',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Job Templates',
      description: 'Create and manage standardized job description templates',
      href: '/dashboard/hr-manager/recruitment/templates/jobs',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: 'Process Templates',
      description: 'Define hiring stages and progress tracking',
      href: '/dashboard/hr-manager/recruitment/templates/process',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      title: 'Analytics',
      description: 'Monitor recruitment metrics and performance',
      href: '/dashboard/hr-manager/recruitment/analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Offer Approvals',
      description: 'Review and approve candidate offers',
      href: '/dashboard/hr-manager/recruitment/offers',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const statCards = [
    { label: 'Open Jobs', value: stats.openJobs, color: 'bg-blue-500' },
    { label: 'Active Candidates', value: stats.activeCandidates, color: 'bg-emerald-500' },
    { label: 'Pending Offers', value: stats.pendingOffers, color: 'bg-amber-500' },
    { label: 'Hired This Month', value: stats.hiredThisMonth, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Recruitment Management</h1>
        <p className="text-sm text-slate-500 mt-1">Manage job templates, hiring processes, and offers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-xl font-bold">
                  {loading ? '...' : stat.value}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading ? '—' : stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                  {module.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{module.description}</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
