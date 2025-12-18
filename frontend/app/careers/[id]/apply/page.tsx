'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getJobById, applyToJob, createCandidate, uploadDocument } from '@/app/services/recruitment';
import { JobRequisition } from '@/app/types/recruitment';

/**
 * REC-007: Candidate Application Form
 * REC-028: GDPR Consent for Data Processing
 * Public application page - no authentication required
 */

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    coverLetter: '',
    linkedInUrl: '',
    portfolioUrl: '',
    cvFile: null as File | null,
    dataProcessingConsent: false,
    backgroundCheckConsent: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const data = await getJobById(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.cvFile) errors.cvFile = 'CV/Resume is required';
    
    // GDPR Compliance (BR-28)
    if (!formData.dataProcessingConsent) {
      errors.dataProcessingConsent = 'You must consent to data processing to apply (GDPR requirement)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setFormErrors({ ...formErrors, cvFile: 'Only PDF and Word documents are allowed' });
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors({ ...formErrors, cvFile: 'File size must be less than 5MB' });
        return;
      }
      setFormData({ ...formData, cvFile: file });
      setFormErrors({ ...formErrors, cvFile: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      // Step 1: Create candidate profile
      const candidateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        linkedInUrl: formData.linkedInUrl || undefined,
        portfolioUrl: formData.portfolioUrl || undefined,
        source: 'career_site',
      };
      const candidate = await createCandidate(candidateData);

      // Step 2: Upload CV
      const cvFormData = new FormData();
      cvFormData.append('file', formData.cvFile!);
      cvFormData.append('ownerId', candidate._id || candidate.id);
      cvFormData.append('type', 'cv');
      const uploadedDoc = await uploadDocument(cvFormData);

      // Step 3: Submit application (REC-007, REC-028)
      await applyToJob({
        candidateId: candidate._id || candidate.id,
        requisitionId: jobId,
        cvFilePath: (uploadedDoc as any).filePath || (uploadedDoc as any).url || uploadedDoc.fileUrl,
        coverLetter: formData.coverLetter || undefined,
        dataProcessingConsent: formData.dataProcessingConsent, // BR-28
        backgroundCheckConsent: formData.backgroundCheckConsent,
      });

      setSuccess(true);
      
      // Redirect to success page after 3 seconds
      setTimeout(() => {
        router.push('/careers');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
      console.error('Application error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading application form...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-800 mb-4">Job not found</p>
            <Link href="/careers">
              <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg">
                Back to Careers
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-12 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for applying for {job.title}. We'll review your application and get back to you soon.
          </p>
          <Link href="/careers">
            <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
              Back to Careers
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href={`/careers/${jobId}`}>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Job Details
            </button>
          </Link>
        </div>
      </header>

      {/* Application Form */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Job Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Apply for {job.title}</h1>
            <p className="text-gray-600">{job.department} • {job.location}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Additional Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn Profile (Optional)
                </label>
                <input
                  type="url"
                  value={formData.linkedInUrl}
                  onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  placeholder="https://yourportfolio.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* CV Upload (REC-007) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume/CV <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className={`w-full px-4 py-2 border rounded-lg ${
                  formErrors.cvFile ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <p className="text-sm text-gray-500 mt-1">PDF or Word document, max 5MB</p>
              {formErrors.cvFile && (
                <p className="text-red-500 text-sm mt-1">{formErrors.cvFile}</p>
              )}
            </div>

            {/* Cover Letter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Letter (Optional)
              </label>
              <textarea
                value={formData.coverLetter}
                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                rows={6}
                placeholder="Tell us why you're a great fit for this role..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* GDPR Consent (REC-028, BR-28) */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Data Processing Consent</h3>
              
              <div className="flex items-start mb-3">
                <input
                  type="checkbox"
                  id="dataConsent"
                  checked={formData.dataProcessingConsent}
                  onChange={(e) => setFormData({ ...formData, dataProcessingConsent: e.target.checked })}
                  className="mt-1 mr-3"
                />
                <label htmlFor="dataConsent" className="text-sm text-gray-700">
                  <span className="text-red-500">*</span> I consent to the processing of my personal data for recruitment purposes in accordance with GDPR regulations. (Required)
                </label>
              </div>
              {formErrors.dataProcessingConsent && (
                <p className="text-red-500 text-sm mb-3">{formErrors.dataProcessingConsent}</p>
              )}

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="backgroundConsent"
                  checked={formData.backgroundCheckConsent}
                  onChange={(e) => setFormData({ ...formData, backgroundCheckConsent: e.target.checked })}
                  className="mt-1 mr-3"
                />
                <label htmlFor="backgroundConsent" className="text-sm text-gray-700">
                  I consent to background checks if required for this position. (Optional)
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Link href={`/careers/${jobId}`} className="flex-1">
                <button
                  type="button"
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
