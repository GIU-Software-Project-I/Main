'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPublishedJobs, applyToJob } from '@/app/services/recruitment';
import { JobRequisition } from '@/app/types/recruitment';

/**
 * REC-023: Public Careers Page
 * BR-6: Auto-post approved requisitions to career sites
 * 
 * This is a public-facing page (no authentication required)
 * Displays published job openings for external candidates
 */

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department: '',
    location: '',
    type: '',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublishedJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load job openings');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter jobs based on selected filters
  const filteredJobs = jobs.filter((job) => {
    if (filters.department && job.department !== filters.department) return false;
    if (filters.location && job.location !== filters.location) return false;
    if (filters.type && job.employmentType !== filters.type) return false;
    return true;
  });

  // Get unique values for filter dropdowns
  const departments = Array.from(new Set(jobs.map((j) => j.department)));
  const locations = Array.from(new Set(jobs.map((j) => j.location)));
  const types = Array.from(new Set(jobs.map((j) => j.employmentType)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading opportunities...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header - Company Branding (BR-6) */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Join Our Team</h1>
              <p className="text-lg text-gray-600 mt-2">
                Build your career with us. Explore open positions and apply today.
              </p>
            </div>
            <Link href="/">
              <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Company Values Section (Employer Branding) */}
      <section className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Why Work With Us?</h2>
            <p className="text-blue-100 mt-2">We believe in empowering our people</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-xl font-semibold mb-2">Innovation</h3>
              <p className="text-blue-100">Work on cutting-edge projects that make a difference</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
              <p className="text-blue-100">Join a supportive team that values your input</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="text-xl font-semibold mb-2">Growth</h3>
              <p className="text-blue-100">Continuous learning and career development</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-12 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Benefits & Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">💰</div>
              <p className="font-medium text-gray-900">Competitive Salary</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🏥</div>
              <p className="font-medium text-gray-900">Health Insurance</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🏖️</div>
              <p className="font-medium text-gray-900">Paid Time Off</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🎓</div>
              <p className="font-medium text-gray-900">Training & Development</p>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Open Positions ({filteredJobs.length})
          </h2>
        </div>

        {/* Filters */}
        {jobs.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchJobs}
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Job Cards */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No positions available
            </h3>
            <p className="text-gray-600">
              {jobs.length === 0
                ? 'Check back soon for new opportunities!'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job._id || job.requisitionId}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600">{job.department}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {job.employmentType}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📍</span>
                    {job.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">💼</span>
                    {job.numberOfOpenings} opening(s)
                  </div>
                  {job.salaryRange && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">💰</span>
                      {job.salaryRange.min.toLocaleString()} - {job.salaryRange.max.toLocaleString()} {job.salaryRange.currency}
                    </div>
                  )}
                </div>

                {job.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {job.description}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <Link
                    href={`/careers/${job._id || job.requisitionId}`}
                    className="flex-1"
                  >
                    <button className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      View Details
                    </button>
                  </Link>
                  <Link
                    href={`/careers/${job._id || job.requisitionId}/apply`}
                  >
                    <button className="px-4 py-2 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors">
                      Apply
                    </button>
                  </Link>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Posted: {new Date(job.postingDate || job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} Your Company. All rights reserved.
          </p>
          <div className="mt-4 space-x-6">
            <Link href="/about" className="text-gray-400 hover:text-white">
              About Us
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-white">
              Contact
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
