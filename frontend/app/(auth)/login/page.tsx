// filepath: d:\WebstormProjects\HR System\Main\frontend\app\(auth)\login\page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, error: authError, clearError, getDashboardRoute } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const dashboardRoute = getDashboardRoute();
      router.push(dashboardRoute);
    }
  }, [isAuthenticated, router, getDashboardRoute]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  const displayError = localError || authError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    const success = await login(email, password);
    if (success) {
      const dashboardRoute = getDashboardRoute();
      router.push(dashboardRoute);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 rounded-lg mb-4">
            <span className="text-white font-bold text-lg">HR</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500 mt-2">Enter your credentials to access your account</p>
        </div>

        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          {displayError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="you@company.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/register" className="text-sm text-slate-600 hover:text-slate-900">
              Don&apos;t have an account? Register as candidate
            </Link>
          </div>
        </div>

        {/* Test Credentials */}
        <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-lg">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Test Credentials</p>
          <div className="space-y-1 text-xs text-slate-600">
            <p><span className="font-medium">HR Admin:</span> hr.admin@company.hr-admin.com</p>
            <p><span className="font-medium">System Admin:</span> system.admin@company.system-admin.com</p>
            <p><span className="font-medium">Employee:</span> department.employee@company.department-employee.com</p>
            <p><span className="font-medium">Password:</span> RoleUser@1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}

