'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { payrollExecutionService } from '@/app/services/payroll-execution';

interface Stats {
  pendingRuns: number;
  totalEmployees: number;
  draftRuns: number;
  totalNetPay: number;
  signingBonusesPending: number;
  terminationBenefitsPending: number;
}

interface RecentRun {
  _id: string;
  payrollPeriod: string;
  status: string;
  entity?: string;
  entityName?: string;
  employees?: number;
  totalEmployees?: number;
  totalnetpay: number;
  createdAt: string;
}

export default function PayrollSpecialistPage() {
  const [stats, setStats] = useState<Stats>({
    pendingRuns: 0,
    totalEmployees: 0,
    draftRuns: 0,
    totalNetPay: 0,
    signingBonusesPending: 0,
    terminationBenefitsPending: 0,
  });
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [runsRes, signingRes, terminationRes] = await Promise.all([
        payrollExecutionService.listRuns({ page: 1, limit: 100 }),
        payrollExecutionService.listSigningBonuses('pending'),
        payrollExecutionService.listTerminationBenefits('pending'),
      ]);

      const runsData = (runsRes?.data || runsRes) as any;
      const runs = Array.isArray(runsData?.data) ? runsData.data : Array.isArray(runsData) ? runsData : [];
      
      const signingData = (signingRes?.data || signingRes) as any;
      const signingBonuses = Array.isArray(signingData) ? signingData : [];
      
      const terminationData = (terminationRes?.data || terminationRes) as any;
      const terminationBenefits = Array.isArray(terminationData) ? terminationData : [];

      // Normalize status for comparison (handle spaces/underscores)
      const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');
      
      const draftRuns = runs.filter((r: any) => normalizeStatus(r.status) === 'draft').length;
      // Pending runs: draft or unlocked (needing specialist attention)
      const pendingRuns = runs.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return status === 'draft' || status === 'unlocked';
      }).length;
      const totalEmps = runs.reduce((sum: number, r: any) => sum + (r.employees || r.totalEmployees || 0), 0);
      const totalNet = runs.reduce((sum: number, r: any) => sum + (r.totalnetpay || 0), 0);

      setStats({
        pendingRuns,
        totalEmployees: totalEmps,
        draftRuns,
        totalNetPay: totalNet,
        signingBonusesPending: signingBonuses.length,
        terminationBenefitsPending: terminationBenefits.length,
      });

      setRecentRuns(runs.slice(0, 5));
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `EGP ${amount.toLocaleString()}`;
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  const formatPeriod = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', year: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      under_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Under Review' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
      pending_finance_approval: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pending Finance' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      locked: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Locked' },
    };
    const s = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Specialist Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage payroll processing and configurations</p>
        </div>
        <Link href="/dashboard/payroll-specialist/runs?tab=create">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            + New Payroll Run
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Runs</p>
              <p className={`text-2xl font-bold mt-1 ${stats.pendingRuns > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                {loading ? '...' : stats.pendingRuns}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Net Payroll</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '...' : formatCurrency(stats.totalNetPay)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Signing Bonuses Pending</p>
              <p className={`text-2xl font-bold mt-1 ${stats.signingBonusesPending > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
                {loading ? '...' : stats.signingBonusesPending}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/payroll-specialist/runs?tab=create">
            <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center cursor-pointer">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="font-medium text-slate-900 text-sm">New Payroll</p>
            </div>
          </Link>
          <Link href="/dashboard/payroll-specialist/runs">
            <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center cursor-pointer">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="font-medium text-slate-900 text-sm">View Runs</p>
            </div>
          </Link>
          <Link href="/dashboard/payroll-specialist/runs?tab=bonuses">
            <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center cursor-pointer">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <p className="font-medium text-slate-900 text-sm">Signing Bonuses</p>
            </div>
          </Link>
          <Link href="/dashboard/payroll-specialist/pay-grades">
            <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center cursor-pointer">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-medium text-slate-900 text-sm">Configuration</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Payroll Runs</h2>
          <Link href="/dashboard/payroll-specialist/runs" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : recentRuns.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No payroll runs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Period</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Employees</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Net Pay</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/payroll-specialist/runs?id=${run._id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {formatPeriod(run.payrollPeriod)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{run.entity || run.entityName || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-600">{run.employees || run.totalEmployees || 0}</td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{formatCurrency(run.totalnetpay || 0)}</td>
                    <td className="py-3 px-4">{getStatusBadge(run.status)}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{formatDate(run.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
