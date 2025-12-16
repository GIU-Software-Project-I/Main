'use client';

import Link from 'next/link';

export default function JobCandidatePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Job Candidate Portal</h1>
          <p className="text-slate-600 mt-2">Track your applications and status</p>
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
          <p className="text-slate-600 text-sm">Applications</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">3</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Under Review</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">1</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Interview Scheduled</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">1</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Status</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">Active</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">💼</div>
            <p className="font-medium text-slate-900">Browse Jobs</p>
          </button>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">📋</div>
            <p className="font-medium text-slate-900">My Applications</p>
          </button>
          <Link href="/dashboard/department-employee/employee-profile" className="contents">
            <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center w-full">
              <div className="text-2xl mb-2">👤</div>
              <p className="font-medium text-slate-900">My Profile</p>
            </button>
          </Link>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="font-medium text-slate-900">Messages</p>
          </button>
        </div>
      </div>
    </div>
  );
}

