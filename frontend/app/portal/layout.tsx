'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

interface PortalLayoutProps {
  children: ReactNode;
}

const PORTAL_NAV_ITEMS = [
  {
    label: 'My Profile',
    href: '/portal/my-profile',
    icon: 'user',
  },
  {
    label: 'My Attendance',
    href: '/portal/my-attendance',
    icon: 'clock',
  },
  {
    label: 'My Leaves',
    href: '/portal/my-leaves',
    icon: 'calendar',
  },
  {
    label: 'My Performance',
    href: '/portal/my-performance',
    icon: 'trending-up',
  },
  {
    label: 'My Payslips',
    href: '/portal/my-payslips',
    icon: 'dollar',
  },
  {
    label: 'My Onboarding',
    href: '/portal/my-onboarding',
    icon: 'clipboard',
  },
  {
    label: 'Resignation',
    href: '/portal/my-resignation',
    icon: 'log-out',
  },
];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = className || 'w-5 h-5';

  switch (name) {
    case 'user':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    case 'clock':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'calendar':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    case 'trending-up':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
    case 'dollar':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'clipboard':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
    case 'log-out':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    case 'home':
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    default:
      return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /></svg>;
  }
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/portal/my-profile') {
      return pathname === href || pathname.startsWith(href + '/');
    }
    return pathname.startsWith(href);
  };

  const getRoleDashboardUrl = () => {
    if (!user?.role) return '/dashboard';
    const roleMap: Record<string, string> = {
      'department employee': '/dashboard/department-employee',
      'department head': '/dashboard/department-head',
      'HR Manager': '/dashboard/hr-manager',
      'HR Employee': '/dashboard/hr-employee',
      'HR Admin': '/dashboard/hr-admin',
      'System Admin': '/dashboard/system-admin',
      'Payroll Specialist': '/dashboard/payroll-specialist',
      'Payroll Manager': '/dashboard/payroll-manager',
      'Recruiter': '/dashboard/recruiter',
      'Finance Staff': '/dashboard/finance-staff',
      'Job Candidate': '/dashboard/job-candidate',
      'Legal & Policy Admin': '/dashboard/legal-policy-admin',
    };
    return roleMap[user.role] || '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full overflow-y-auto">
        {/* Logo/Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href={getRoleDashboardUrl()} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">HR</span>
            </div>
            <span className="font-semibold text-gray-900">Employee Portal</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <NavIcon name="user" className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4">
          <div className="space-y-1">
            {/* Back to Dashboard */}
            <Link
              href={getRoleDashboardUrl()}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <NavIcon name="home" className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Self Service
              </p>
            </div>

            {PORTAL_NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <NavIcon name={item.icon} className={`w-5 h-5 ${active ? 'text-blue-600' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}

