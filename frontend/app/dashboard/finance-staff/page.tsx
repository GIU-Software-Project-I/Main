'use client';

import Link from 'next/link';

export default function FinanceStaffPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Finance Staff Dashboard</h1>
          <p className="text-slate-600 mt-2">Payroll review and financial management</p>
        </div>
        <Link href="/dashboard/department-employee/employee-profile">
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            My Profile
          </button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Monthly Payroll</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">$2.4M</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Pending Reviews</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">2</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Budget Variance</p>
          <p className="text-2xl font-bold text-green-600 mt-2">+2.3%</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Reconciliation</p>
          <p className="text-2xl font-bold text-green-600 mt-2">Complete</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium text-slate-900">Payroll Review</p>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">💰</div>
            <p className="font-medium text-slate-900">Budget</p>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">✅</div>
            <p className="font-medium text-slate-900">Reconciliation</p>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">📈</div>
            <p className="font-medium text-slate-900">Analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
}

