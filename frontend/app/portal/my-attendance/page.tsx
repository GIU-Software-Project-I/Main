'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { timeManagementService } from '@/app/services/time-management';

interface AttendanceRecord {
  _id: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'ON_LEAVE';
  workHours?: number;
  overtime?: number;
  notes?: string;
}

interface CorrectionRequest {
  _id: string;
  date: string;
  type: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export default function MyAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await timeManagementService.getAttendanceRecord();
      if (response.data) {
        const data = response.data as any;
        setRecords(Array.isArray(data.records) ? data.records : []);
        setTodayRecord(data.today || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setClockingIn(true);
      setError(null);
      await timeManagementService.clockIn({ timestamp: new Date().toISOString() });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClockingOut(true);
      setError(null);
      await timeManagementService.clockOut({ timestamp: new Date().toISOString() });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Present' };
      case 'ABSENT':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Absent' };
      case 'LATE':
        return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Late' };
      case 'EARLY_LEAVE':
        return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Early Leave' };
      case 'ON_LEAVE':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'On Leave' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate stats
  const thisMonthRecords = records.filter(r => {
    const date = new Date(r.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const stats = {
    present: thisMonthRecords.filter(r => r.status === 'PRESENT').length,
    late: thisMonthRecords.filter(r => r.status === 'LATE').length,
    absent: thisMonthRecords.filter(r => r.status === 'ABSENT').length,
    totalHours: thisMonthRecords.reduce((sum, r) => sum + (r.workHours || 0), 0),
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-48 bg-white rounded-xl shadow-sm"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white rounded-xl shadow-sm"></div>
              ))}
            </div>
            <div className="h-64 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">My Attendance</h1>
            <p className="text-gray-500 mt-1">Track your daily attendance and work hours</p>
          </div>
          <Link
            href="/portal/my-attendance/corrections"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Request Correction
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Clock In/Out Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-blue-100 text-sm">Current Time</p>
              <p className="text-4xl font-bold mt-1">{currentTime}</p>
              <p className="text-blue-100 mt-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Today's Status */}
              <div className="bg-white/10 rounded-lg px-4 py-3">
                <p className="text-blue-100 text-sm">Today's Status</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-blue-200">Clock In</p>
                    <p className="text-lg font-semibold">{formatTime(todayRecord?.clockIn)}</p>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div>
                    <p className="text-xs text-blue-200">Clock Out</p>
                    <p className="text-lg font-semibold">{formatTime(todayRecord?.clockOut)}</p>
                  </div>
                </div>
              </div>

              {/* Clock Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClockIn}
                  disabled={clockingIn || !!todayRecord?.clockIn}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    todayRecord?.clockIn
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : 'bg-white text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {clockingIn ? 'Clocking In...' : todayRecord?.clockIn ? 'Clocked In' : 'Clock In'}
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={clockingOut || !todayRecord?.clockIn || !!todayRecord?.clockOut}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    !todayRecord?.clockIn || todayRecord?.clockOut
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : 'bg-white text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {clockingOut ? 'Clocking Out...' : todayRecord?.clockOut ? 'Clocked Out' : 'Clock Out'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Days Present"
            value={stats.present}
            icon="check"
            color="green"
          />
          <StatCard
            title="Days Late"
            value={stats.late}
            icon="clock"
            color="amber"
          />
          <StatCard
            title="Days Absent"
            value={stats.absent}
            icon="x"
            color="red"
          />
          <StatCard
            title="Total Hours"
            value={`${stats.totalHours.toFixed(1)}h`}
            icon="time"
            color="blue"
          />
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Attendance History</h2>
            <Link
              href="/portal/my-attendance/history"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>

          {records.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock In</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock Out</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.slice(0, 10).map((record) => {
                    const statusConfig = getStatusConfig(record.status);
                    return (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatTime(record.clockIn)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatTime(record.clockOut)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.workHours ? `${record.workHours.toFixed(1)}h` : '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Card */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Need to Correct an Entry?</h3>
              <p className="text-gray-600 mt-1 text-sm">
                If you missed a clock in/out or need to make corrections to your attendance record,
                submit a correction request for manager approval.
              </p>
              <Link
                href="/portal/my-attendance/corrections"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Submit Correction Request
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: string;
  color: 'green' | 'amber' | 'red' | 'blue';
}) {
  const colorClasses = {
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  };

  const colors = colorClasses[color];

  const getIcon = () => {
    switch (icon) {
      case 'check':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'clock':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'x':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'time':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center ${colors.text}`}>
          {getIcon()}
        </div>
      </div>
    </div>
  );
}

