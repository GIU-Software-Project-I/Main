'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Map system roles to URL-safe dashboard paths
const ROLE_TO_PATH: Record<string, string> = {
  'department employee': 'department-employee',
  'department head': 'department-head',
  'HR Manager': 'hr-manager',
  'HR Employee': 'hr-employee',
  'Payroll Specialist': 'payroll-specialist',
  'Payroll Manager': 'payroll-manager',
  'System Admin': 'system-admin',
  'Legal & Policy Admin': 'legal-policy-admin',
  'Recruiter': 'recruiter',
  'Finance Staff': 'finance-staff',
  'Job Candidate': 'job-candidate',
  'HR Admin': 'hr-admin',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to role-specific dashboard
    if (user?.role) {
      // Get the URL-safe path for the role
      const rolePath = ROLE_TO_PATH[user.role] || user.role.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, '');
      router.push(`/dashboard/${rolePath}`);
    }
  }, [user?.role, router]);

  return null;
}

