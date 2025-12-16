'use client';

import { useState, useEffect } from 'react';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';

// =====================================================
// Types
// =====================================================

interface JobRequisition {
  id: string;
  requisitionId: string;
  title: string;
  department: string;
  location: string;
  openings: number;
  publishStatus: 'draft' | 'published' | 'closed';
  postingDate?: string;
  expiryDate?: string;
  applicationCount: number;
  description: string;
  requirements: string[];
  qualifications: string[];
  responsibilities: string[];
  hiringManagerName: string;
  createdAt: string;
}

interface EmployerBranding {
  companyName: string;
  logo: string;
  tagline: string;
  description: string;
  benefits: string[];
  culture: string[];
}

// =====================================================
// Mock Data
// =====================================================

const mockJobs: JobRequisition[] = [
  {
    id: '1',
    requisitionId: 'REQ-2024-001',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'Cairo, Egypt',
    openings: 2,
    publishStatus: 'published',
    postingDate: '2024-12-01',
    expiryDate: '2025-01-15',
    applicationCount: 45,
    description: 'We are looking for a Senior Software Engineer to join our growing team...',
    requirements: ['5+ years of experience', 'Strong problem-solving skills', 'Team leadership experience'],
    qualifications: ['Bachelor\'s in Computer Science', 'Experience with React/Node.js', 'Cloud experience (AWS/GCP)'],
    responsibilities: ['Lead development projects', 'Mentor junior developers', 'Architect solutions'],
    hiringManagerName: 'Ahmed Hassan',
    createdAt: '2024-11-15',
  },
  {
    id: '2',
    requisitionId: 'REQ-2024-002',
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote',
    openings: 1,
    publishStatus: 'draft',
    postingDate: undefined,
    expiryDate: '2025-02-01',
    applicationCount: 0,
    description: 'Join our product team to drive innovation and deliver value to our customers...',
    requirements: ['3+ years in product management', 'Agile methodology experience', 'Data-driven mindset'],
    qualifications: ['MBA preferred', 'Technical background', 'Excellent communication'],
    responsibilities: ['Define product roadmap', 'Collaborate with stakeholders', 'Analyze metrics'],
    hiringManagerName: 'Sara Ahmed',
    createdAt: '2024-12-01',
  },
  {
    id: '3',
    requisitionId: 'REQ-2024-003',
    title: 'UX Designer',
    department: 'Design',
    location: 'Alexandria, Egypt',
    openings: 1,
    publishStatus: 'closed',
    postingDate: '2024-10-01',
    expiryDate: '2024-11-30',
    applicationCount: 32,
    description: 'Create beautiful and intuitive user experiences for our digital products...',
    requirements: ['Portfolio required', 'User research experience', 'Prototyping skills'],
    qualifications: ['Design degree', 'Figma/Sketch proficiency', '3+ years experience'],
    responsibilities: ['Conduct user research', 'Create wireframes', 'Design UI components'],
    hiringManagerName: 'Mohamed Ali',
    createdAt: '2024-09-20',
  },
  {
    id: '4',
    requisitionId: 'REQ-2024-004',
    title: 'HR Coordinator',
    department: 'Human Resources',
    location: 'Cairo, Egypt',
    openings: 1,
    publishStatus: 'draft',
    postingDate: undefined,
    expiryDate: '2025-01-31',
    applicationCount: 0,
    description: 'Support our HR team in managing employee relations and recruitment processes...',
    requirements: ['HR experience', 'Strong organizational skills', 'HRIS knowledge'],
    qualifications: ['HR certification preferred', 'Bachelor\'s degree', 'Excellent interpersonal skills'],
    responsibilities: ['Coordinate interviews', 'Manage onboarding', 'Maintain records'],
    hiringManagerName: 'Fatima Ibrahim',
    createdAt: '2024-12-10',
  },
];

const mockEmployerBranding: EmployerBranding = {
  companyName: 'TechCorp Solutions',
  logo: '/logo-placeholder.png',
  tagline: 'Building the Future Together',
  description: 'We are a leading technology company dedicated to creating innovative solutions that transform businesses and improve lives.',
  benefits: [
    'Competitive Salary & Bonuses',
    'Health Insurance',
    'Remote Work Options',
    'Learning & Development Budget',
    'Flexible Working Hours',
    'Annual Leave + Paid Time Off',
  ],
  culture: [
    'Innovation First',
    'Collaborative Environment',
    'Work-Life Balance',
    'Diversity & Inclusion',
    'Continuous Learning',
  ],
};

// =====================================================
// Status Badge Component
// =====================================================

function StatusBadge({ status }: { status: 'draft' | 'published' | 'closed' }) {
  const statusStyles = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabels = {
    draft: 'Draft',
    published: 'Published',
    closed: 'Closed',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

// =====================================================
// Job Preview Modal
// =====================================================

function JobPreviewModal({
  job,
  branding,
  onClose,
  onPublish,
  isPublishing,
}: {
  job: JobRequisition;
  branding: EmployerBranding;
  onClose: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Branding */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-t-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-xl">TC</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{branding.companyName}</h2>
              <p className="text-indigo-200">{branding.tagline}</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-indigo-200">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {job.department}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {job.openings} Opening{job.openings > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Job Details */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <section>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">About This Role</h3>
            <p className="text-slate-600">{job.description}</p>
          </section>

          {/* Responsibilities */}
          <section>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Responsibilities</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {job.responsibilities.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Requirements */}
          <section>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Requirements</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {job.requirements.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Qualifications */}
          <section>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Qualifications</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {job.qualifications.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Benefits & Culture */}
          <section className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Why Join Us?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Benefits</h4>
                <ul className="space-y-1">
                  {branding.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Our Culture</h4>
                <ul className="space-y-1">
                  {branding.culture.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          {job.publishStatus === 'draft' && (
            <Button
              variant="primary"
              onClick={onPublish}
              isLoading={isPublishing}
            >
              Publish Job
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Employer Branding Section
// =====================================================

function EmployerBrandingSection({ branding }: { branding: EmployerBranding }) {
  return (
    <Card className="mb-6">
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-600 font-bold text-2xl">TC</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">{branding.companyName}</h2>
          <p className="text-indigo-600 font-medium">{branding.tagline}</p>
          <p className="text-slate-600 mt-2 text-sm">{branding.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {branding.culture.slice(0, 4).map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm">
          Edit Branding
        </Button>
      </div>
    </Card>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function HREmployeeJobsPage() {
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobRequisition | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Load jobs on mount
  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setJobs(mockJobs);
      setLoading(false);
    };
    loadJobs();
  }, []);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requisitionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.publishStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle publish job
  const handlePublishJob = async (jobId: string) => {
    setIsPublishing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, publishStatus: 'published' as const, postingDate: new Date().toISOString().split('T')[0] }
          : job
      )
    );
    
    setIsPublishing(false);
    setPublishSuccess(jobId);
    setSelectedJob(null);
    
    // Clear success message after 3 seconds
    setTimeout(() => setPublishSuccess(null), 3000);
  };

  // Stats
  const stats = {
    total: jobs.length,
    draft: jobs.filter((j) => j.publishStatus === 'draft').length,
    published: jobs.filter((j) => j.publishStatus === 'published').length,
    closed: jobs.filter((j) => j.publishStatus === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Job Publishing</h1>
        <p className="text-slate-600 mt-1">
          Manage and publish job postings to the company careers page
        </p>
      </div>

      {/* Success Alert */}
      {publishSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-emerald-800 font-medium">Job published successfully! It is now visible on the careers page.</span>
        </div>
      )}

      {/* Employer Branding Section (BR-6, REC-023) */}
      <EmployerBrandingSection branding={mockEmployerBranding} />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Draft</p>
          <p className="text-2xl font-bold text-slate-700">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Published</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Closed</p>
          <p className="text-2xl font-bold text-red-600">{stats.closed}</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="Search jobs by title, department, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'draft', 'published', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Jobs Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Job Details
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Applications
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Posted Date
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No jobs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{job.title}</p>
                        <p className="text-sm text-slate-500">{job.requisitionId}</p>
                        <p className="text-sm text-slate-500">{job.location} • {job.openings} opening{job.openings > 1 ? 's' : ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700">{job.department}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.publishStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700">{job.applicationCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700">
                        {job.postingDate || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                        >
                          Preview
                        </Button>
                        {job.publishStatus === 'draft' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handlePublishJob(job.id)}
                            isLoading={isPublishing && selectedJob?.id === job.id}
                          >
                            Publish
                          </Button>
                        )}
                        {job.publishStatus === 'published' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setJobs((prev) =>
                                prev.map((j) =>
                                  j.id === job.id ? { ...j, publishStatus: 'closed' as const } : j
                                )
                              );
                            }}
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Job Preview Modal */}
      {selectedJob && (
        <JobPreviewModal
          job={selectedJob}
          branding={mockEmployerBranding}
          onClose={() => setSelectedJob(null)}
          onPublish={() => handlePublishJob(selectedJob.id)}
          isPublishing={isPublishing}
        />
      )}
    </div>
  );
}
