'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { timeManagementService } from '@/app/services/time-management';

export default function AttendanceCorrectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    correctionType: 'missing_clock_in',
    correctedTime: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.date || !formData.correctedTime || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await timeManagementService.requestCorrection({
        date: formData.date,
        type: formData.correctionType,
        correctedTime: formData.correctedTime,
        reason: formData.reason,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/portal/my-attendance');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-800">Correction Request Submitted</h2>
            <p className="text-green-600 mt-2">Your correction request has been submitted for approval.</p>
            <p className="text-sm text-green-500 mt-4">Redirecting to My Attendance...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/portal/my-attendance"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Attendance
            </Link>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Request Correction</h1>
            <p className="text-gray-500 mt-1">Submit a correction for your attendance record</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Correction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correction Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'missing_clock_in', label: 'Missing Clock In', icon: 'login' },
                { value: 'missing_clock_out', label: 'Missing Clock Out', icon: 'logout' },
                { value: 'wrong_clock_in', label: 'Wrong Clock In Time', icon: 'edit-clock-in' },
                { value: 'wrong_clock_out', label: 'Wrong Clock Out Time', icon: 'edit-clock-out' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, correctionType: type.value })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.correctionType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      formData.correctionType === type.value ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {type.value.includes('clock_in') ? (
                        <svg className={`w-5 h-5 ${formData.correctionType === type.value ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      ) : (
                        <svg className={`w-5 h-5 ${formData.correctionType === type.value ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      formData.correctionType === type.value ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Corrected Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.correctionType.includes('clock_in') ? 'Correct Clock In Time' : 'Correct Clock Out Time'}
            </label>
            <input
              type="time"
              value={formData.correctedTime}
              onChange={(e) => setFormData({ ...formData, correctedTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Correction</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please explain why you need this correction..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/portal/my-attendance"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        {/* Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">About Correction Requests</p>
              <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
                <li>Correction requests require manager approval</li>
                <li>Please provide accurate details to expedite approval</li>
                <li>You will be notified once your request is processed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

