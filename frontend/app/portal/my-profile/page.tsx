'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { employeeProfileService } from '@/app/services/employee-profile';

interface ProfileData {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  department?: string;
  position?: string;
  jobTitle?: string;
  hireDate?: string;
  employmentStatus?: string;
  employmentType?: string;
  supervisor?: string;
  payGrade?: string;
  biography?: string;
  profilePhoto?: string;
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default function MyProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) {
      setError('Unable to determine user identity');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await employeeProfileService.getMyProfile(user.id);
      if (response.error) {
        throw new Error(response.error);
      }
      setProfile(response.data as ProfileData);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
            <h3 className="font-semibold">Error Loading Profile</h3>
            <p className="mt-1">{error}</p>
            <button
              onClick={fetchProfile}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create a default profile that satisfies the ProfileData interface
  const defaultProfile: ProfileData = {
    _id: '',
    employeeId: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  };

  const displayProfile: ProfileData = profile ?? defaultProfile;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">My Profile</h1>
            <p className="text-gray-500 mt-1">View and manage your personal information</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/portal/my-profile/corrections"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Correction Requests
            </Link>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {displayProfile.profilePhoto ? (
                <img
                  src={displayProfile.profilePhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900">
                {displayProfile.firstName} {displayProfile.lastName}
              </h2>
              <p className="text-gray-500 mt-1">{displayProfile.jobTitle || displayProfile.position || 'Employee'}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                {displayProfile.department && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {displayProfile.department}
                  </span>
                )}
                {displayProfile.employmentStatus && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full ${
                    displayProfile.employmentStatus === 'Active' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      displayProfile.employmentStatus === 'Active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    {displayProfile.employmentStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Personal Information</h3>
            <Link
              href="/portal/my-profile/edit"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Edit Contact Info
            </Link>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoField label="Email" value={displayProfile.email} icon="email" />
              <InfoField label="Phone" value={displayProfile.phone} icon="phone" />
              <InfoField label="Date of Birth" value={displayProfile.dateOfBirth ? new Date(displayProfile.dateOfBirth).toLocaleDateString() : undefined} icon="calendar" />
              <InfoField label="Gender" value={displayProfile.gender} icon="user" />
              <InfoField label="Nationality" value={displayProfile.nationality} icon="globe" />
              <InfoField label="Marital Status" value={displayProfile.maritalStatus} icon="heart" />
            </div>
            {displayProfile.address && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-2">Address</p>
                <p className="text-gray-900">
                  {[
                    displayProfile.address.street,
                    displayProfile.address.city,
                    displayProfile.address.state,
                    displayProfile.address.country,
                    displayProfile.address.postalCode
                  ].filter(Boolean).join(', ') || 'Not provided'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Employment Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Employment Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoField label="Employee ID" value={displayProfile.employeeId} icon="id" />
              <InfoField label="Job Title" value={displayProfile.jobTitle} icon="briefcase" />
              <InfoField label="Department" value={displayProfile.department} icon="building" />
              <InfoField label="Position" value={displayProfile.position} icon="position" />
              <InfoField label="Employment Type" value={displayProfile.employmentType} icon="type" />
              <InfoField label="Hire Date" value={displayProfile.hireDate ? new Date(displayProfile.hireDate).toLocaleDateString() : undefined} icon="calendar" />
              <InfoField label="Supervisor" value={displayProfile.supervisor} icon="user" />
              <InfoField label="Pay Grade" value={displayProfile.payGrade} icon="dollar" />
            </div>
          </div>
        </div>

        {/* Biography */}
        {displayProfile.biography && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Biography</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap">{displayProfile.biography}</p>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Emergency Contacts</h3>
            <Link
              href="/portal/my-profile/emergency-contacts"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Manage
            </Link>
          </div>
          <div className="p-6">
            {displayProfile.emergencyContacts && displayProfile.emergencyContacts.length > 0 ? (
              <div className="space-y-4">
                {displayProfile.emergencyContacts.map((contact, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      <p className="text-sm text-gray-500">{contact.relationship}</p>
                      <p className="text-sm text-gray-600 mt-1">{contact.phone}</p>
                      {contact.email && <p className="text-sm text-gray-600">{contact.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500">No emergency contacts added</p>
                <Link
                  href="/portal/my-profile/emergency-contacts"
                  className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Add Emergency Contact
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Request Correction Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Need to Update Other Information?</h3>
              <p className="text-gray-600 mt-1 text-sm">
                For changes to employment details, job title, or department, please submit a correction request. HR will review and process your request.
              </p>
              <Link
                href="/portal/my-profile/corrections"
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

function InfoField({ label, value, icon }: { label: string; value?: string; icon: string }) {
  const getIcon = () => {
    switch (icon) {
      case 'email':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
      case 'phone':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
      case 'calendar':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      case 'user':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case 'globe':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'heart':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
      case 'briefcase':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
      case 'building':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
      case 'id':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>;
      case 'dollar':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /></svg>;
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        {getIcon()}
        <span>{label}</span>
      </div>
      <p className="text-gray-900 font-medium">{value || 'Not provided'}</p>
    </div>
  );
}

