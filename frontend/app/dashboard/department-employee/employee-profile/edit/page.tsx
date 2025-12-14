'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { employeeProfileService } from '@/app/services/employee-profile';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';

/**
 * Employee Profile Edit Page - Department Employee
 * US-E2-05: Update contact information (immediate)
 * US-E2-12: Update bio and photo (immediate)
 * US-E6-02: Submit correction request for critical data
 */
export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contact' | 'bio' | 'correction'>('contact');

  // Contact Info State
  const [contactInfo, setContactInfo] = useState({
    mobilePhone: '',
    homePhone: '',
    personalEmail: '',
    address: {
      city: '',
      streetAddress: '',
      country: '',
    },
  });

  // Bio State
  const [bioInfo, setBioInfo] = useState({
    biography: '',
    profilePictureUrl: '',
  });

  // Correction Request State
  const [correctionRequest, setCorrectionRequest] = useState({
    requestDescription: '',
    reason: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await employeeProfileService.getMyProfile();
        const data = response.data as any;
        setProfile(data);

        // Initialize contact info
        setContactInfo({
          mobilePhone: data?.mobilePhone || '',
          homePhone: data?.homePhone || '',
          personalEmail: data?.personalEmail || '',
          address: {
            city: data?.address?.city || '',
            streetAddress: data?.address?.streetAddress || '',
            country: data?.address?.country || '',
          },
        });

        // Initialize bio
        setBioInfo({
          biography: data?.biography || '',
          profilePictureUrl: data?.profilePictureUrl || '',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await employeeProfileService.updateContactInfo(contactInfo);
      setSuccessMessage('Contact information updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update contact information');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await employeeProfileService.updateBio(bioInfo);
      setSuccessMessage('Biography updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update biography');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitCorrectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionRequest.requestDescription.trim()) {
      setError('Please describe the correction you need');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await employeeProfileService.submitCorrectionRequest(correctionRequest);
      setSuccessMessage('Correction request submitted successfully! HR will review it.');
      setCorrectionRequest({ requestDescription: '', reason: '' });
      setTimeout(() => {
        setSuccessMessage(null);
        router.push('/dashboard/department-employee/employee-profile');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800 font-medium">No profile data found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Profile</h1>
          <p className="text-slate-600 mt-2">Update your personal information</p>
        </div>
        <Link href="/dashboard/department-employee/employee-profile">
          <Button variant="outline">
            ← Back to Profile
          </Button>
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✓ {successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">⚠ {error}</p>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="text-8xl">👤</div>
          <div>
            <h2 className="text-3xl font-bold">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-blue-100 mt-2">{profile.positionName || 'N/A'}</p>
            <p className="text-blue-100">{profile.departmentName || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-3 font-medium transition-colors ${activeTab === 'contact'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          📞 Contact Information
        </button>
        <button
          onClick={() => setActiveTab('bio')}
          className={`px-4 py-3 font-medium transition-colors ${activeTab === 'bio'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          ✍️ Biography & Photo
        </button>
        <button
          onClick={() => setActiveTab('correction')}
          className={`px-4 py-3 font-medium transition-colors ${activeTab === 'correction'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          📝 Request Correction
        </button>
      </div>

      {/* Contact Information Tab */}
      {activeTab === 'contact' && (
        <form onSubmit={handleUpdateContactInfo} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Update Contact Information</h3>
          <p className="text-sm text-slate-600 mb-6">
            These changes will be applied immediately without requiring approval.
          </p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Mobile Phone"
                type="tel"
                value={contactInfo.mobilePhone}
                onChange={(e) => setContactInfo({ ...contactInfo, mobilePhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
              <Input
                label="Home Phone"
                type="tel"
                value={contactInfo.homePhone}
                onChange={(e) => setContactInfo({ ...contactInfo, homePhone: e.target.value })}
                placeholder="+1 (555) 987-6543"
              />
            </div>

            <Input
              label="Personal Email"
              type="email"
              value={contactInfo.personalEmail}
              onChange={(e) => setContactInfo({ ...contactInfo, personalEmail: e.target.value })}
              placeholder="your.email@example.com"
            />

            <div className="space-y-6">
              <h4 className="font-semibold text-slate-900">Address</h4>
              <Input
                label="Street Address"
                value={contactInfo.address.streetAddress}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  address: { ...contactInfo.address, streetAddress: e.target.value }
                })}
                placeholder="123 Main Street, Apt 4B"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="City"
                  value={contactInfo.address.city}
                  onChange={(e) => setContactInfo({
                    ...contactInfo,
                    address: { ...contactInfo.address, city: e.target.value }
                  })}
                  placeholder="New York"
                />
                <Input
                  label="Country"
                  value={contactInfo.address.country}
                  onChange={(e) => setContactInfo({
                    ...contactInfo,
                    address: { ...contactInfo.address, country: e.target.value }
                  })}
                  placeholder="United States"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <Button type="submit" isLoading={saving}>
              💾 Save Contact Information
            </Button>
            <Link href="/dashboard/department-employee/employee-profile">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      )}

      {/* Biography & Photo Tab */}
      {activeTab === 'bio' && (
        <form onSubmit={handleUpdateBio} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Update Biography & Photo</h3>
          <p className="text-sm text-slate-600 mb-6">
            These changes will be applied immediately without requiring approval.
          </p>

          <div className="space-y-6">
            {/* Profile Picture Upload */}
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Profile Picture
              </label>

              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Current/Preview Image */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                    {bioInfo.profilePictureUrl ? (
                      <img
                        src={bioInfo.profilePictureUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-6xl">👤</div>
                    )}
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  <div className="space-y-3">
                    <input
                      type="file"
                      id="profile-picture-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size (max 2MB)
                          if (file.size > 2 * 1024 * 1024) {
                            alert('Image size should be less than 2MB');
                            return;
                          }

                          // Convert to base64
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBioInfo({ ...bioInfo, profilePictureUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    <label
                      htmlFor="profile-picture-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium"
                    >
                      📸 Choose Photo
                    </label>

                    {bioInfo.profilePictureUrl && (
                      <button
                        type="button"
                        onClick={() => setBioInfo({ ...bioInfo, profilePictureUrl: '' })}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium ml-2"
                      >
                        🗑️ Remove Photo
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Upload a profile picture (JPG, PNG, or GIF). Max size: 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Biography
              </label>
              <textarea
                value={bioInfo.biography}
                onChange={(e) => setBioInfo({ ...bioInfo, biography: e.target.value })}
                placeholder="Tell us about yourself, your role, interests, and professional background..."
                rows={6}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
              <p className="mt-1.5 text-sm text-slate-500">
                {bioInfo.biography.length} characters
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <Button type="submit" isLoading={saving}>
              💾 Save Biography
            </Button>
            <Link href="/dashboard/department-employee/employee-profile">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      )}

      {/* Correction Request Tab */}
      {activeTab === 'correction' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 About Correction Requests</h4>
            <p className="text-blue-800 text-sm">
              Use this form to request changes to critical profile data such as name, date of birth,
              national ID, or employment details. These requests require HR approval before being applied.
            </p>
          </div>

          <form onSubmit={handleSubmitCorrectionRequest} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Request Profile Correction</h3>

            <div className="space-y-6">
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Correction Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={correctionRequest.requestDescription}
                  onChange={(e) => setCorrectionRequest({ ...correctionRequest, requestDescription: e.target.value })}
                  placeholder="Describe what needs to be corrected and what the correct information should be..."
                  rows={5}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                <p className="mt-1.5 text-sm text-slate-500">
                  Be specific about what needs to be changed
                </p>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason (Optional)
                </label>
                <textarea
                  value={correctionRequest.reason}
                  onChange={(e) => setCorrectionRequest({ ...correctionRequest, reason: e.target.value })}
                  placeholder="Provide additional context or reason for this correction..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button type="submit" isLoading={saving}>
                📨 Submit Request
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCorrectionRequest({ requestDescription: '', reason: '' })}
              >
                Clear Form
              </Button>
            </div>
          </form>

          {/* View My Requests Link */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h4 className="font-semibold text-slate-900 mb-2">Track Your Requests</h4>
            <p className="text-slate-600 text-sm mb-4">
              Want to see the status of your previous correction requests?
            </p>
            <Link href="/dashboard/department-employee/employee-profile/correction-requests">
              <Button variant="outline" size="sm">
                View My Correction Requests →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
