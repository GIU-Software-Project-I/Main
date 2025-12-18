'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { getApplicationsByCandidate, getInterviews, getOfferByApplication } from '@/app/services/recruitment';
import { Application, Interview } from '@/app/types/recruitment';
import { ApplicationStatus, InterviewStatus, ApplicationStage } from '@/app/types/enums';

/**
 * Job Candidate Dashboard - REC-017
 * Real-time dashboard with actual application data
 */

interface DashboardStats {
  totalApplications: number;
  underReview: number;
  interviewsScheduled: number;
  offersReceived: number;
  status: 'Active' | 'No Active Applications';
}

interface UpcomingInterview {
  id: string;
  jobTitle: string;
  date: string;
  time: string;
  type: string;
}

export default function JobCandidatePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    underReview: 0,
    interviewsScheduled: 0,
    offersReceived: 0,
    status: 'No Active Applications',
  });
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch candidate's applications
      const applications = await getApplicationsByCandidate(user.id);

      // Calculate stats from real data
      const underReview = applications.filter(
        (a) => a.status === ApplicationStatus.IN_PROCESS || a.status === ApplicationStatus.SUBMITTED
      ).length;

      const offersReceived = applications.filter(
        (a) => a.status === ApplicationStatus.OFFER || a.currentStage === ApplicationStage.OFFER
      ).length;

      const hasActiveApplications = applications.some(
        (a) => a.status !== ApplicationStatus.REJECTED && a.status !== ApplicationStatus.HIRED
      );

      // Fetch interviews for the candidate
      let scheduledInterviews = 0;
      const upcomingList: UpcomingInterview[] = [];

      for (const app of applications) {
        try {
          const interviews = await getInterviews({ applicationId: app.id });
          const scheduled = interviews.filter((i) => i.status === InterviewStatus.SCHEDULED);
          scheduledInterviews += scheduled.length;

          // Add to upcoming list
          scheduled.forEach((interview) => {
            const date = new Date(interview.scheduledDate);
            upcomingList.push({
              id: interview.id,
              jobTitle: app.jobTitle || 'Position',
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              type: interview.method || 'Interview',
            });
          });
        } catch {
          // Interview fetch failed for this application
        }
      }

      // Sort upcoming interviews by date
      upcomingList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setStats({
        totalApplications: applications.length,
        underReview,
        interviewsScheduled: scheduledInterviews,
        offersReceived,
        status: hasActiveApplications ? 'Active' : 'No Active Applications',
      });

      setUpcomingInterviews(upcomingList.slice(0, 3)); // Show top 3
      setRecentApplications(applications.slice(0, 3)); // Show 3 most recent
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Job Candidate Portal</h1>
          <p className="text-slate-600 mt-2">Track your applications and status</p>
        </div>
        <Link href="/portal/my-profile">
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            My Profile
          </button>
        </Link>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">{error}</p>
        </div>
      )}

      {/* Quick Stats - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Applications</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalApplications}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Under Review</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">{stats.underReview}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Interviews Scheduled</p>
          <p className="text-2xl font-bold text-cyan-600 mt-2">{stats.interviewsScheduled}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Offers Received</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.offersReceived}</p>
        </div>
      </div>

      {/* Upcoming Interviews */}
      {upcomingInterviews.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Interviews</h2>
          <div className="space-y-3">
            {upcomingInterviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100"
              >
                <div>
                  <p className="font-medium text-slate-900">{interview.jobTitle}</p>
                  <p className="text-sm text-slate-600">{interview.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600">{interview.date}</p>
                  <p className="text-sm text-slate-600">{interview.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/careers" className="contents">
            <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center w-full">
              <div className="text-2xl mb-2">💼</div>
              <p className="font-medium text-slate-900">Browse Jobs</p>
            </button>
          </Link>
          <Link href="/dashboard/job-candidate/recruitment/applications" className="contents">
            <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center w-full">
              <div className="text-2xl mb-2">📋</div>
              <p className="font-medium text-slate-900">My Applications</p>
            </button>
          </Link>
          <Link href="/portal/my-profile" className="contents">
            <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center w-full">
              <div className="text-2xl mb-2">👤</div>
              <p className="font-medium text-slate-900">My Profile</p>
            </button>
          </Link>
          <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="font-medium text-slate-900">Messages</p>
          </button>
        </div>
      </div>

      {/* Application Status Legend */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Application Status Guide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-slate-600">Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-slate-600">In Review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">Offer Received</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-slate-600">Hired</span>
          </div>
        </div>
      </div>
    </div>
  );
}

