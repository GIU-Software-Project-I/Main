'use client';

import { useState, useEffect } from 'react';

import { timeManagementService, PunchInRequest, PunchOutRequest } from '@/app/services/time-management';
import { Button, Card } from "@/app/components";
import { useAuth } from '@/app/context/AuthContext';
import { AttendanceRecord } from '@/app/types/time-management';
import { PunchType } from '@/app/types/enums';

export default function TimeManagementPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [clockInTime, setClockInTime] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Fetch today's attendance record on mount to check current status
    useEffect(() => {
        // Only run once when component mounts and user is available
        if (!user?.id || isInitialized) return;

        const fetchTodayRecord = async () => {
            try {
                const response = await timeManagementService.getTodayRecord(user.id);
                if (response.data) {
                    const record = response.data as AttendanceRecord;
                    const punches = record.punches || [];

                    if (punches.length > 0) {
                        const lastPunch = punches[punches.length - 1];
                        // If last punch is IN, employee is clocked in
                        setIsClockedIn(lastPunch.type === PunchType.IN);
                        if (lastPunch.type === PunchType.IN) {
                            setClockInTime(new Date(lastPunch.time).toLocaleTimeString());
                        }
                    }
                }
            } catch (err) {
                console.log('No attendance record found for today');
            } finally {
                setIsInitialized(true);
            }
        };

        fetchTodayRecord();
    }, [user?.id, isInitialized]);

    const handleClockIn = async () => {
        // Simple state guards - don't proceed if already loading or clocked in
        if (!user?.id || loading || isClockedIn) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const request: PunchInRequest = {
                employeeId: user.id,
                source: 'web-app',
            };

            const response = await timeManagementService.punchIn(request);

            if (response.error) {
                setError(response.error);
                return;
            }

            // Update UI with response data
            if (response.data) {
                const record = response.data as AttendanceRecord;
                const lastPunch = record.punches?.[record.punches.length - 1];

                if (lastPunch && lastPunch.type === PunchType.IN) {
                    setIsClockedIn(true);
                    setClockInTime(new Date(lastPunch.time).toLocaleTimeString());
                    setSuccess('Successfully clocked in!');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clock in');
            console.error('Clock-in error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        // Simple state guards - don't proceed if already loading or not clocked in
        if (!user?.id || loading || !isClockedIn) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const request: PunchOutRequest = {
                employeeId: user.id,
                source: 'web-app',
            };

            const response = await timeManagementService.punchOut(request);

            if (response.error) {
                setError(response.error);
                return;
            }

            // Update UI on successful clock out
            if (response.data) {
                setIsClockedIn(false);
                setClockInTime(null);
                setSuccess('Successfully clocked out!');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clock out');
            console.error('Clock-out error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Time Management</h1>
                <p className="text-gray-600">Clock in and out to track your working hours</p>
            </div>

            <Card className="p-6">
                <div className="space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                            {success}
                        </div>
                    )}

                    <div className="bg-gray-50 p-6 rounded-lg">
                        <div className="text-center space-y-4">
                            <div>
                                <p className="text-gray-600 text-sm mb-2">Current Status</p>
                                <p className="text-2xl font-bold">
                                    {isClockedIn ? '✅ Clocked In' : '❌ Clocked Out'}
                                </p>
                                {clockInTime && (
                                    <p className="text-gray-600 text-sm mt-2">
                                        Clocked in at: {clockInTime}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center pt-4">
                        <Button
                            onClick={handleClockIn}
                            disabled={loading || isClockedIn}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                        >
                            {loading ? 'Processing...' : '🕐 Clock In'}
                        </Button>

                        <Button
                            onClick={handleClockOut}
                            disabled={loading || !isClockedIn}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-2"
                        >
                            {loading ? 'Processing...' : '🕐 Clock Out'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}