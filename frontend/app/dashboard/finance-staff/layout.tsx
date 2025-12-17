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
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const requiredRoles = [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasRequiredRole = user?.role && requiredRoles.includes(user.role as SystemRole);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user has required roles for Finance Staff access
    if (!hasRequiredRole) {
      // Redirect to unauthorized page or user's default dashboard
      router.push('/unauthorized');
      return;
    }
  }, [user, isAuthenticated, router, hasRequiredRole]);

  // Block rendering if not authenticated or not authorized
  if (!isAuthenticated || !hasRequiredRole) {
    return null;
  }

  return <>{children}</>;
}
