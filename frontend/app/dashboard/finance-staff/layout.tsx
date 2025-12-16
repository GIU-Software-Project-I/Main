'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SystemRole } from '@/app/types';

export default function FinanceStaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { hasRole, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user has required roles for Finance Staff access
    const requiredRoles = [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
    if (!hasRole(requiredRoles)) {
      // Redirect to unauthorized page or user's default dashboard
      router.push('/unauthorized');
      return;
    }
  }, [hasRole, isAuthenticated, router]);

  // Block rendering if not authenticated or not authorized
  if (!isAuthenticated || !hasRole([SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN])) {
    return null;
  }

  return <>{children}</>;
}
