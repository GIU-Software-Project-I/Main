'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SystemRole } from '@/app/types';

export default function HRManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const allowedRoles = [
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!hasAccess) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, hasAccess, router]);

  if (!isAuthenticated || !hasAccess) {
    return null;
  }

  return <>{children}</>;
}

