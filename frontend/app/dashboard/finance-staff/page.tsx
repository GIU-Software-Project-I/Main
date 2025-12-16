'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { payrollExecutionService } from '@/app/services/payroll-execution';

interface Stats {
  pendingApprovals: number;
  totalPayroll: number;
  payslipsReady: number;
  fullyApproved: number;
  totalRuns: number;
}

interface RecentRun {
  _id: string;
  entity?: string;
  payrollPeriod?: any;
  status?: string;
  totalnetpay?: number;
  totalNetPay?: number;
  approvedByManager?: boolean;
  approvedByFinance?: boolean;
  payslipsGenerated?: boolean;
  createdAt?: string;
}

export default function FinanceStaffPage() {
  const [stats, setStats] = useState<Stats>({
    pendingApprovals: 0,
    totalPayroll: 0,
    payslipsReady: 0,
    fullyApproved: 0,
    totalRuns: 0,
  });
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setError('');
    try {
      const res = await payrollExecutionService.listRuns({ page: 1, limit: 100 });
      
      if (res?.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      
      const data = (res?.data || res) as any;
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      // Status mapping based on actual database values:
      // - "locked" = Finance approved (final state, frozen)
      // - "pending finance approval" or "approved" = Manager approved, pending finance approval
      // - "under review" / "under_review" / "processing" = Still with specialist/manager
      
      const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');
      
      // Runs pending finance approval (status = pending_finance_approval or approved by manager)
      const pendingFinance = items.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return status === 'pending_finance_approval' || status === 'approved';
      });
      const pending = pendingFinance.length;
      
      // Total payroll pending finance approval
      const totalPay = pendingFinance.reduce((sum: number, r: any) => 
        sum + (r.totalnetpay || r.totalNetPay || 0), 0);
      
      // Runs that are locked (finance approved / frozen)
      const lockedRuns = items.filter((r: any) => normalizeStatus(r.status) === 'locked');
      const fullyApprovedCount = lockedRuns.length;
      
      // Count payslips - runs with locked status typically have payslips
      // For now, count locked runs as having payslips generated
      const withPayslips = lockedRuns.length;
      
      setStats({
        pendingApprovals: pending,
        totalPayroll: totalPay,
        payslipsReady: withPayslips,
        fullyApproved: fullyApprovedCount,
        totalRuns: items.length,
      });
      
      // Get recent runs for activity feed (sorted by date, top 5)
      const sorted = [...items].sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setRecentRuns(sorted.slice(0, 5));
    } catch (e: any) {
      console.error('Failed to fetch stats:', e);
      setError(e?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `EGP ${amount.toLocaleString()}`;
  };

  const formatPeriod = (period: any): string => {
    if (!period) return 'N/A';
    
    // Handle ISO date string like "2025-03-31T22:00:00.000Z"
    if (typeof period === 'string') {
      const d = new Date(period);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }
      return period;
    }
    
    // Handle object with month/year
    if (typeof period === 'object') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = period.month !== undefined ? monthNames[period.month] || `M${period.month}` : '';
      const year = period.year || '';
      if (month && year) return `${month} ${year}`;
      
      // Handle startDate/endDate
      if (period.startDate) {
        const d = new Date(period.startDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        }
      }
    }
    return 'N/A';
  };

  const getStatusBadge = (run: RecentRun) => {
    const status = (run.status || '').toLowerCase().replace(/\s+/g, '_');
    
    // Status mapping:
    // "locked" = Finance approved (final)
    // "approved" = Manager approved, pending finance
    // "under_review" / "processing" = Pending manager
    
    if (status === 'locked') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Finance Approved</span>;
    }
    
    if (status === 'approved') {
      return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">Pending Your Approval</span>;
    }
    
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Pending Manager</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Finance Staff Dashboard</h1>
          <p className="text-slate-800 mt-2">Final payroll approval and payslip generation</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchStats(); }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Pending Finance Approval</p>
          <p className={`text-2xl font-bold mt-2 ${stats.pendingApprovals > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
            {loading ? '...' : stats.pendingApprovals}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Pending Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : formatCurrency(stats.totalPayroll)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Payslips Generated</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {loading ? '...' : stats.payslipsReady}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Fully Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {loading ? '...' : stats.fullyApproved}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Total Runs</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {loading ? '...' : stats.totalRuns}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Payroll Activity</h2>
          <Link href="/dashboard/finance-staff/runs" className="text-sm text-green-600 hover:text-green-700">
            View All →
          </Link>
        </div>
        {loading ? (
          <p className="text-slate-500 text-center py-4">Loading...</p>
        ) : recentRuns.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No payroll runs found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 text-slate-600">Department</th>
                  <th className="text-left px-4 py-2 text-slate-600">Period</th>
                  <th className="text-left px-4 py-2 text-slate-600">Net Pay</th>
                  <th className="text-left px-4 py-2 text-slate-600">Status</th>
                  <th className="text-left px-4 py-2 text-slate-600">Payslips</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRuns.map((run) => {
                  const status = (run.status || '').toLowerCase().replace(/\s+/g, '_');
                  const hasPayslips = status === 'locked';
                  return (
                    <tr key={run._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{run.entity || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatPeriod(run.payrollPeriod)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(run.totalnetpay || run.totalNetPay || 0)}</td>
                      <td className="px-4 py-3">{getStatusBadge(run)}</td>
                      <td className="px-4 py-3">
                        {hasPayslips ? (
                          <span className="text-purple-600">✓ Generated</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/dashboard/finance-staff/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">✅</div>
            <p className="font-medium text-slate-900">Approve Payroll</p>
            <p className="text-xs text-slate-500 mt-1">Final approval step</p>
          </Link>
          <Link 
            href="/dashboard/finance-staff/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">📄</div>
            <p className="font-medium text-slate-900">Generate Payslips</p>
            <p className="text-xs text-slate-500 mt-1">Create employee payslips</p>
          </Link>
          <Link 
            href="/dashboard/finance-staff/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium text-slate-900">Financial Review</p>
            <p className="text-xs text-slate-500 mt-1">Gross-to-net breakdown</p>
          </Link>
          <Link 
            href="/dashboard/finance-staff/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">📋</div>
            <p className="font-medium text-slate-900">All Runs</p>
            <p className="text-xs text-slate-500 mt-1">View history</p>
          </Link>
        </div>
      </div>

      {/* Responsibilities Info */}
      <div className="bg-green-50 rounded-lg border border-green-200 p-6">
        <h2 className="text-lg font-semibold text-green-900 mb-3">Your Responsibilities</h2>
        <ul className="text-sm text-green-800 space-y-2">
          <li>• Provide final approval of payroll after manager review</li>
          <li>• Generate payslips automatically after approval</li>
          <li>• Review gross-to-net breakdown and verify all deductions</li>
          <li>• Verify tax calculations and insurance deductions are correct</li>
          <li>• You are the final step in the approval workflow</li>
        </ul>
      </div>

      {/* Workflow Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Approval Workflow</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">1</span>
            <span>Specialist Creates</span>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">2</span>
            <span>Manager Approves</span>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">3</span>
            <span>Finance Approves (You)</span>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex items-center gap-2 text-purple-600">
            <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">4</span>
            <span>Payslips Generated</span>
          </div>
        </div>
      </div>
    </div>
  );
}

