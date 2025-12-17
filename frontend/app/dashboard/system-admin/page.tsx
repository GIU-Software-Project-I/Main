'use client';

import Link from 'next/link';

export default function SystemAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Admin Dashboard</h1>
          <p className="text-slate-600 mt-2">System-wide configuration and management</p>
        </div>
        <Link href="/portal/my-profile">
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            My Profile
          </button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">System Uptime</p>
          <p className="text-2xl font-bold text-green-600 mt-2">99.9%</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Active Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">145</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Backup Status</p>
          <p className="text-2xl font-bold text-green-600 mt-2">OK</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Alerts</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/system-admin/organization">
            <button className="w-full p-4 border border-slate-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-center">
              <div className="text-2xl mb-2">🏢</div>
              <p className="font-medium text-slate-900">Organization</p>
              <p className="text-xs text-slate-500 mt-1">View structure</p>
            </button>
          </Link>
          <Link href="/dashboard/system-admin/departments">
            <button className="w-full p-4 border border-slate-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-center">
              <div className="text-2xl mb-2">🏛️</div>
              <p className="font-medium text-slate-900">Departments</p>
              <p className="text-xs text-slate-500 mt-1">Manage departments</p>
            </button>
          </Link>
          <Link href="/dashboard/system-admin/positions">
            <button className="w-full p-4 border border-slate-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-center">
              <div className="text-2xl mb-2">💼</div>
              <p className="font-medium text-slate-900">Positions</p>
              <p className="text-xs text-slate-500 mt-1">Manage positions</p>
            </button>
          </Link>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-center">
            <div className="text-2xl mb-2">🔧</div>
            <p className="font-medium text-slate-900">Maintenance</p>
            <p className="text-xs text-slate-500 mt-1">System tools</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent System Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-slate-700">System backup completed successfully</span>
            <span className="text-xs text-slate-500 ml-auto">2 hours ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-slate-700">New department created: Marketing</span>
            <span className="text-xs text-slate-500 ml-auto">5 hours ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-slate-700">Position updated: Senior Developer</span>
            <span className="text-xs text-slate-500 ml-auto">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

