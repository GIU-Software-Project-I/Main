'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApprovalsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/department-head');
  }, [router]);

  return (
    <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-500">Redirecting to Leave Approvals...</p>
      </div>
    </div>
  );
}

