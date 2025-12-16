'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { payrollExecutionService } from '@/app/services/payroll-execution';

interface Stats {
  pendingApprovals: number;
  totalPayroll: number;
  exceptions: number;
  frozenRuns: number;
}

export default function PayrollManagerPage() {
  const [stats, setStats] = useState<Stats>({
    pendingApprovals: 0,
    totalPayroll: 0,
    exceptions: 0,
    frozenRuns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await payrollExecutionService.listRuns({ page: 1, limit: 100 });
      
      if (res?.error) {
        console.error('Failed to fetch stats:', res.error);
        setStats({
          pendingApprovals: 0,
          totalPayroll: 0,
          exceptions: 0,
          frozenRuns: 0,
        });
        return;
      }
      
      const data = (res?.data || res) as any;
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      // Normalize status for comparison
      const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');
      
      // Pending manager approval: status is 'under_review' (submitted by specialist for manager review)
      const pending = items.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return status === 'under_review' || status === 'under review';
      }).length;
      
      const totalPay = items.reduce((sum: number, r: any) => sum + (r.totalnetpay || r.totalNetPay || 0), 0);
      const totalExceptions = items.reduce((sum: number, r: any) => sum + (r.exceptions || 0), 0);
      
      // Frozen/Locked runs: status is 'locked' or 'frozen', or has frozen=true
      const frozen = items.filter((r: any) => {
        const status = (r.status || '').toLowerCase();
        return status === 'locked' || status === 'frozen' || r.frozen === true;
      }).length;
      
      setStats({
        pendingApprovals: pending,
        totalPayroll: totalPay,
        exceptions: totalExceptions,
        frozenRuns: frozen,
      });
    } catch (e: any) {
      console.error('Failed to fetch stats:', e);
      setStats({
        pendingApprovals: 0,
        totalPayroll: 0,
        exceptions: 0,
        frozenRuns: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `EGP ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payroll Manager Dashboard</h1>
        <p className="text-slate-800 mt-2">Review, approve, and manage payroll runs</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Pending Approvals</p>
          <p className={`text-2xl font-bold mt-2 ${stats.pendingApprovals > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
            {loading ? '...' : stats.pendingApprovals}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Total Payroll</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : formatCurrency(stats.totalPayroll)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Exceptions</p>
          <p className={`text-2xl font-bold mt-2 ${stats.exceptions > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {loading ? '...' : stats.exceptions}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Frozen Runs</p>
          <p className={`text-2xl font-bold mt-2 ${stats.frozenRuns > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
            {loading ? '...' : stats.frozenRuns}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link 
            href="/dashboard/payroll-manager/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">✅</div>
            <p className="font-medium text-slate-900">Approve Payroll</p>
            <p className="text-xs text-slate-500 mt-1">Review & approve runs</p>
          </Link>
          <Link 
            href="/dashboard/payroll-manager/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">🔒</div>
            <p className="font-medium text-slate-900">Freeze/Unfreeze</p>
            <p className="text-xs text-slate-500 mt-1">Lock finalized payroll</p>
          </Link>
          <Link 
            href="/dashboard/payroll-manager/irregularities"
            className="p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">⚠️</div>
            <p className="font-medium text-slate-900">Irregularities</p>
            <p className="text-xs text-slate-500 mt-1">Resolve escalated issues</p>
          </Link>
          <Link 
            href="/dashboard/payroll-manager/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">📋</div>
            <p className="font-medium text-slate-900">All Runs</p>
            <p className="text-xs text-slate-500 mt-1">View history</p>
          </Link>
          <Link 
            href="/dashboard/payroll-manager/irregularities"
            className="p-4 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">🔴</div>
            <p className="font-medium text-slate-900">Critical Issues</p>
            <p className="text-xs text-slate-500 mt-1">Negative pay & spikes</p>
          </Link>
        </div>
      </div>

      {/* Responsibilities Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">Your Responsibilities</h2>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Review payroll drafts and verify employee-by-employee calculations</li>
          <li>• Approve payroll runs after resolving any exceptions or discrepancies</li>
          <li>• Freeze finalized payroll to prevent unauthorized changes</li>
          <li>• Unfreeze payroll with documented reason when corrections are needed</li>
          <li>• Ensure multi-step approval workflow: Specialist → Manager → Finance</li>
        </ul>
      </div>
    </div>
  );
}

