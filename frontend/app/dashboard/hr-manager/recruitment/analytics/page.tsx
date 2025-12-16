'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

// ==================== INTERFACES ====================
interface AnalyticsData {
  openJobs: number;
  activeCandidates: number;
  avgTimeToHire: number;
  hiredThisMonth: number;
  totalApplications: number;
  interviewsScheduled: number;
}

interface PipelineStage {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface JobMetric {
  id: string;
  title: string;
  department: string;
  applicants: number;
  interviews: number;
  offers: number;
  hired: number;
  avgDays: number;
  status: 'open' | 'closed';
}

interface TimeToHireData {
  month: string;
  days: number;
}

// ==================== MOCK DATA ====================
const mockAnalytics: AnalyticsData = {
  openJobs: 12,
  activeCandidates: 156,
  avgTimeToHire: 28,
  hiredThisMonth: 5,
  totalApplications: 342,
  interviewsScheduled: 24,
};

const mockPipeline: PipelineStage[] = [
  { name: 'Screening', count: 89, percentage: 35, color: 'bg-blue-500' },
  { name: 'Interview', count: 45, percentage: 25, color: 'bg-emerald-500' },
  { name: 'Offer', count: 15, percentage: 20, color: 'bg-amber-500' },
  { name: 'Hired', count: 7, percentage: 20, color: 'bg-purple-500' },
];

const mockJobMetrics: JobMetric[] = [
  { id: '1', title: 'Software Engineer', department: 'Engineering', applicants: 45, interviews: 12, offers: 3, hired: 2, avgDays: 25, status: 'open' },
  { id: '2', title: 'Product Manager', department: 'Product', applicants: 32, interviews: 8, offers: 2, hired: 1, avgDays: 32, status: 'open' },
  { id: '3', title: 'HR Coordinator', department: 'HR', applicants: 28, interviews: 6, offers: 1, hired: 1, avgDays: 21, status: 'closed' },
  { id: '4', title: 'Marketing Specialist', department: 'Marketing', applicants: 38, interviews: 10, offers: 2, hired: 0, avgDays: 18, status: 'open' },
  { id: '5', title: 'Financial Analyst', department: 'Finance', applicants: 22, interviews: 5, offers: 1, hired: 1, avgDays: 30, status: 'closed' },
];

const mockTimeToHire: TimeToHireData[] = [
  { month: 'Jul', days: 35 },
  { month: 'Aug', days: 32 },
  { month: 'Sep', days: 28 },
  { month: 'Oct', days: 30 },
  { month: 'Nov', days: 26 },
  { month: 'Dec', days: 28 },
];

// ==================== MAIN COMPONENT ====================
export default function RecruitmentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [jobMetrics, setJobMetrics] = useState<JobMetric[]>([]);
  const [timeToHire, setTimeToHire] = useState<TimeToHireData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('last30');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const departments = ['all', 'Engineering', 'Product', 'HR', 'Marketing', 'Finance', 'Sales'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAnalytics(mockAnalytics);
      setPipeline(mockPipeline);
      setJobMetrics(mockJobMetrics);
      setTimeToHire(mockTimeToHire);
      setLoading(false);
    };
    fetchData();
  }, [dateFilter, departmentFilter]);

  const filteredJobMetrics = jobMetrics.filter(
    (job) => departmentFilter === 'all' || job.department === departmentFilter
  );

  const maxTimeToHire = Math.max(...timeToHire.map((t) => t.days));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/dashboard/hr-manager/recruitment" className="hover:text-slate-700">
              Recruitment
            </Link>
            <span>/</span>
            <span>Analytics</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Recruitment Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor recruitment progress and metrics (BR-33)</p>
        </div>
        <Button variant="outline">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Date Range</label>
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="last90">Last 90 days</option>
            <option value="thisYear">This year</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Open Jobs', value: analytics?.openJobs, icon: '📋', color: 'text-blue-600' },
          { label: 'Active Candidates', value: analytics?.activeCandidates, icon: '👥', color: 'text-emerald-600' },
          { label: 'Avg. Time to Hire', value: `${analytics?.avgTimeToHire} days`, icon: '⏱️', color: 'text-amber-600' },
          { label: 'Hired This Month', value: analytics?.hiredThisMonth, icon: '✅', color: 'text-purple-600' },
          { label: 'Total Applications', value: analytics?.totalApplications, icon: '📄', color: 'text-pink-600' },
          { label: 'Interviews Scheduled', value: analytics?.interviewsScheduled, icon: '📅', color: 'text-cyan-600' },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="text-center">
              <span className="text-2xl">{stat.icon}</span>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Pipeline */}
        <Card title="Candidate Pipeline by Stage" subtitle="Current distribution">
          <div className="space-y-4">
            {/* Horizontal Bar */}
            <div className="flex h-8 rounded-lg overflow-hidden">
              {pipeline.map((stage) => (
                <div
                  key={stage.name}
                  className={`${stage.color} flex items-center justify-center text-white text-xs font-medium`}
                  style={{ width: `${stage.percentage}%` }}
                >
                  {stage.percentage >= 15 && `${stage.count}`}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-3">
              {pipeline.map((stage) => (
                <div key={stage.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${stage.color}`}></span>
                    <span className="text-sm text-slate-700">{stage.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{stage.count}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-600">Total Candidates</span>
              <span className="text-lg font-bold text-slate-900">
                {pipeline.reduce((sum, s) => sum + s.count, 0)}
              </span>
            </div>
          </div>
        </Card>

        {/* Time to Hire Trend (BR-33) */}
        <Card title="Time to Hire Trend" subtitle="Average days to fill position">
          <div className="space-y-4">
            {/* Simple Bar Chart */}
            <div className="flex items-end justify-between h-40 gap-2">
              {timeToHire.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-slate-600">{item.days}d</span>
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                    style={{ height: `${(item.days / maxTimeToHire) * 100}%` }}
                  ></div>
                  <span className="text-xs text-slate-500">{item.month}</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600">
                  {Math.min(...timeToHire.map((t) => t.days))}d
                </p>
                <p className="text-xs text-slate-500">Best</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">
                  {Math.round(timeToHire.reduce((sum, t) => sum + t.days, 0) / timeToHire.length)}d
                </p>
                <p className="text-xs text-slate-500">Average</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">
                  {Math.max(...timeToHire.map((t) => t.days))}d
                </p>
                <p className="text-xs text-slate-500">Longest</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Jobs Performance Table */}
      <Card title="Job Performance Metrics" subtitle="Recruitment funnel by position">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Applicants
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Interviews
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Offers
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hired
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Avg Days
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobMetrics.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{job.title}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{job.department}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {job.applicants}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      {job.interviews}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      {job.offers}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {job.hired}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-slate-600">{job.avgDays}d</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        job.status === 'open'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredJobMetrics.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No jobs found for the selected filters
          </div>
        )}
      </Card>

      {/* Source Effectiveness (BR-33) */}
      <Card title="Source Effectiveness" subtitle="Where candidates come from">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { source: 'Company Website', applicants: 124, hired: 8, rate: '6.5%', color: 'bg-blue-500' },
            { source: 'LinkedIn', applicants: 89, hired: 5, rate: '5.6%', color: 'bg-cyan-500' },
            { source: 'Referrals', applicants: 45, hired: 6, rate: '13.3%', color: 'bg-emerald-500' },
            { source: 'Job Boards', applicants: 84, hired: 3, rate: '3.6%', color: 'bg-amber-500' },
          ].map((source) => (
            <div key={source.source} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${source.color}`}></span>
                <span className="text-sm font-medium text-slate-700">{source.source}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Applicants</span>
                  <span className="font-medium text-slate-900">{source.applicants}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Hired</span>
                  <span className="font-medium text-slate-900">{source.hired}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Conversion</span>
                  <span className="font-medium text-emerald-600">{source.rate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
