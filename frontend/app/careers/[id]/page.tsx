'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getJobById } from '@/app/services/recruitment';
import { JobRequisition } from '@/app/types/recruitment';

/**
 * REC-023: Job Details Page (Public)
 * Displays detailed information about a specific job opening
 */

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJobById(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load job details');
      console.error('Error fetching job:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading job details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-800 mb-4">{error || 'Job not found'}</p>
            <Link href="/careers">
              <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                Back to Careers
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/careers">
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to All Jobs
            </button>
          </Link>
        </div>
      </header>

      {/* Job Details */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Main Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {job.title}
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center">
                    <span className="mr-2">🏢</span>
                    {job.department}
                  </span>
                  <span className="flex items-center">
                    <span className="mr-2">📍</span>
                    {job.location}
                  </span>
                </div>
              </div>
              <span className="px-4 py-2 bg-green-100 text-green-800 font-medium rounded-lg">
                {job.numberOfOpenings} Opening(s)
              </span>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Employment Type</p>
                <p className="font-semibold text-gray-900">{job.employmentType}</p>
              </div>
              {job.salaryRange && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Salary Range</p>
                  <p className="font-semibold text-gray-900">
                    {job.salaryRange.min.toLocaleString()} - {job.salaryRange.max.toLocaleString()} {job.salaryRange.currency}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">Posted Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(job.postingDate || job.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Apply Button */}
            <Link href={`/careers/${jobId}/apply`}>
              <button className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Apply for this Position
              </button>
            </Link>
          </div>

          {/* Job Description */}
          {job.description && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
            </div>
          )}

          {/* Qualifications */}
          {job.qualifications && job.qualifications.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Qualifications</h2>
              <ul className="space-y-2">
                {job.qualifications.map((qual, index) => (
                  <li key={index} className="flex items-start text-gray-700">
                    <span className="text-blue-600 mr-2">✓</span>
                    {qual}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills Required */}
          {job.skills && job.skills.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hiring Manager Info */}
          {job.hiringManagerId && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About the Team</h2>
              <p className="text-gray-700">
                This position reports to the {job.department} department.
                You'll be working with a talented team of professionals dedicated to excellence.
              </p>
            </div>
          )}

          {/* Application Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-blue-900 mb-2">Ready to Apply?</h2>
            <p className="text-blue-800 mb-4">
              Click the button below to submit your application. You'll need to provide:
            </p>
            <ul className="space-y-1 text-blue-800 mb-4">
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Your resume/CV
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Contact information
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Cover letter (optional)
              </li>
            </ul>
            <Link href={`/careers/${jobId}/apply`}>
              <button className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Apply Now
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
