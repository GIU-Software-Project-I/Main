'use client';

import { useState, useEffect } from 'react';

export default function MySchedulePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="bg-white rounded-xl shadow-sm p-6 h-40"></div>
            <div className="bg-white rounded-xl shadow-sm p-6 h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">My Schedule</h1>
          <p className="text-gray-500 mt-1">View your work schedule and shift assignments</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">Shift Schedule</h3>
          <p className="text-gray-500 mt-2">Work schedule and shift assignments coming soon</p>
        </div>
      </div>
    </div>
  );
}

