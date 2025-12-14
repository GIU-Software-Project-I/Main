'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';

interface EmployeeProfile {
    _id: string;
    employeeId?: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    fullName?: string;
    nationalId?: string;
    personalEmail?: string;
    mobilePhone?: string;
    homePhone?: string;
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    nationality?: string;
    address?: {
        streetAddress?: string;
        city?: string;
        country?: string;
    };
    department?: string;
    position?: string;
    hireDate?: string;
    employmentType?: string;
    status?: string;
    manager?: { firstName?: string; lastName?: string };
    biography?: string;
    profilePictureUrl?: string;
    emergencyContacts?: Array<{
        name: string;
        relationship: string;
        phone: string;
        email?: string;
        isPrimary?: boolean;
    }>;
}

export default function EmployeeProfilePage() {
    const [profile, setProfile] = useState<EmployeeProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);

    // Contact info form - matches backend DTO exactly
    const [contactForm, setContactForm] = useState({
        mobilePhone: '',
        homePhone: '',
        personalEmail: '',
        address: {
            streetAddress: '',
            city: '',
            country: ''
        }
    });

    // Bio form - matches backend DTO exactly
    const [bioForm, setBioForm] = useState({
        biography: '',
        profilePictureUrl: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await employeeProfileService.getMyProfile();
            if (response.error) {
                setError(response.error);
            } else {
                const data = response.data as EmployeeProfile;
                setProfile(data);
                // Initialize forms with current data
                if (data) {
                    setContactForm({
                        mobilePhone: data.mobilePhone || '',
                        homePhone: data.homePhone || '',
                        personalEmail: data.personalEmail || '',
                        address: {
                            streetAddress: data.address?.streetAddress || '',
                            city: data.address?.city || '',
                            country: data.address?.country || ''
                        }
                    });
                    setBioForm({
                        biography: data.biography || '',
                        profilePictureUrl: data.profilePictureUrl || ''
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleContactUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await employeeProfileService.updateContactInfo(contactForm);
            if (response.error) {
                setError(response.error);
                setSuccessMessage(null);
            } else {
                setSuccessMessage('Contact information updated successfully!');
                setError(null);
                setEditingSection(null);
                await loadProfile(); // Reload profile to show updated data
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update contact info');
            setSuccessMessage(null);
        } finally {
            setSaving(false);
        }
    };

    const handleBioUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await employeeProfileService.updateBio(bioForm);
            if (response.error) {
                setError(response.error);
                setSuccessMessage(null);
            } else {
                setSuccessMessage('Biography updated successfully!');
                setError(null);
                setEditingSection(null);
                await loadProfile(); // Reload profile to show updated data
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update biography');
            setSuccessMessage(null);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        // Reset forms to current profile data
        if (profile) {
            setContactForm({
                mobilePhone: profile.mobilePhone || '',
                homePhone: profile.homePhone || '',
                personalEmail: profile.personalEmail || '',
                address: {
                    streetAddress: profile.address?.streetAddress || '',
                    city: profile.address?.city || '',
                    country: profile.address?.country || ''
                }
            });
            setBioForm({
                biography: profile.biography || '',
                profilePictureUrl: profile.profilePictureUrl || ''
            });
        }
        setEditingSection(null);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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

    if (error && !profile) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Profile</h2>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadProfile}>Try Again</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success/Error Messages */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <span className="text-green-600 text-xl">✓</span>
                    <p className="text-green-800 font-medium">{successMessage}</p>
                </div>
            )}

            {error && profile && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <span className="text-red-600 text-xl">⚠</span>
                    <p className="text-red-800">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-600 hover:text-red-800"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-slate-600 mt-1">View and manage your personal information</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={loadProfile} disabled={loading}>
                        {loading ? 'Refreshing...' : '↻ Refresh'}
                    </Button>
                    <Link href="/dashboard/department-employee">
                        <Button variant="outline">Back to Dashboard</Button>
                    </Link>
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center text-3xl font-bold border-4 border-white/20 overflow-hidden">
                        {profile?.profilePictureUrl ? (
                            <img
                                src={profile.profilePictureUrl}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <>{profile?.firstName?.[0]}{profile?.lastName?.[0]}</>
                        )}
                    </div>

                    {/* Basic Info */}
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-2xl font-bold">
                            {profile?.firstName} {profile?.middleName} {profile?.lastName}
                        </h2>
                        <p className="text-slate-300 mt-1">{profile?.position || 'Position not set'}</p>
                        <p className="text-slate-400 text-sm mt-1">{profile?.department || 'Department not set'}</p>

                        <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-white/10 rounded-full text-sm">
                                ID: {profile?.employeeId || profile?._id?.slice(-8) || 'N/A'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm ${profile?.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                                }`}>
                                {profile?.status || 'Active'}
                            </span>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                                {profile?.employmentType || 'Full-time'}
                            </span>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white/10 rounded-lg p-4 min-w-[140px]">
                            <p className="text-sm font-bold">{formatDate(profile?.hireDate)}</p>
                            <p className="text-xs text-slate-400 mt-1">Hire Date</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-4 min-w-[140px]">
                            <p className="text-sm font-bold">
                                {profile?.manager ? `${profile.manager.firstName} ${profile.manager.lastName}` : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Reports To</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/dashboard/department-employee/employee-profile/emergency-contacts">
                    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer text-center group">
                        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🚨</div>
                        <p className="text-sm font-medium text-slate-700">Emergency Contacts</p>
                        <p className="text-xs text-slate-500 mt-1">{profile?.emergencyContacts?.length || 0} contacts</p>
                    </div>
                </Link>
                <Link href="/dashboard/department-employee/employee-profile/correction-requests">
                    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer text-center group">
                        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📝</div>
                        <p className="text-sm font-medium text-slate-700">Correction Requests</p>
                        <p className="text-xs text-slate-500 mt-1">View & submit</p>
                    </div>
                </Link>
                <div
                    className={`bg-white border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer text-center group ${editingSection === 'contact' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                        }`}
                    onClick={() => setEditingSection(editingSection === 'contact' ? null : 'contact')}
                >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📞</div>
                    <p className="text-sm font-medium text-slate-700">
                        {editingSection === 'contact' ? 'Editing...' : 'Update Contact'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Phone & address</p>
                </div>
                <div
                    className={`bg-white border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer text-center group ${editingSection === 'bio' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                        }`}
                    onClick={() => setEditingSection(editingSection === 'bio' ? null : 'bio')}
                >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">✏️</div>
                    <p className="text-sm font-medium text-slate-700">
                        {editingSection === 'bio' ? 'Editing...' : 'Edit Bio'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Biography & photo</p>
                </div>
            </div>

            {/* Contact Info Edit Form */}
            {editingSection === 'contact' && (
                <div className="bg-white rounded-lg border-2 border-blue-200 shadow-lg p-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">📞 Update Contact Information</h3>
                        <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Editing</span>
                    </div>
                    <form onSubmit={handleContactUpdate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Mobile Phone"
                                type="tel"
                                value={contactForm.mobilePhone}
                                onChange={(e) => setContactForm({ ...contactForm, mobilePhone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                            />
                            <Input
                                label="Home Phone"
                                type="tel"
                                value={contactForm.homePhone}
                                onChange={(e) => setContactForm({ ...contactForm, homePhone: e.target.value })}
                                placeholder="+1 (555) 987-6543"
                            />
                            <Input
                                label="Personal Email"
                                type="email"
                                value={contactForm.personalEmail}
                                onChange={(e) => setContactForm({ ...contactForm, personalEmail: e.target.value })}
                                placeholder="personal@email.com"
                            />
                        </div>

                        <div className="border-t border-slate-200 pt-4 mt-4">
                            <h4 className="text-md font-semibold text-slate-800 mb-3">📍 Address</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="Street Address"
                                    value={contactForm.address.streetAddress}
                                    onChange={(e) => setContactForm({
                                        ...contactForm,
                                        address: { ...contactForm.address, streetAddress: e.target.value }
                                    })}
                                    placeholder="123 Main Street, Apt 4B"
                                />
                                <Input
                                    label="City"
                                    value={contactForm.address.city}
                                    onChange={(e) => setContactForm({
                                        ...contactForm,
                                        address: { ...contactForm.address, city: e.target.value }
                                    })}
                                    placeholder="New York"
                                />
                                <Input
                                    label="Country"
                                    value={contactForm.address.country}
                                    onChange={(e) => setContactForm({
                                        ...contactForm,
                                        address: { ...contactForm.address, country: e.target.value }
                                    })}
                                    placeholder="United States"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-200">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : '💾 Save Changes'}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={saving}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bio Edit Form */}
            {editingSection === 'bio' && (
                <div className="bg-white rounded-lg border-2 border-blue-200 shadow-lg p-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">✏️ Update Biography</h3>
                        <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Editing</span>
                    </div>
                    <form onSubmit={handleBioUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Biography</label>
                            <textarea
                                value={bioForm.biography}
                                onChange={(e) => setBioForm({ ...bioForm, biography: e.target.value })}
                                rows={5}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                placeholder="Write a short bio about yourself, your skills, interests, and professional experience..."
                            />
                            <p className="text-xs text-slate-500 mt-1">{bioForm.biography.length} characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture URL</label>
                            <Input
                                value={bioForm.profilePictureUrl}
                                onChange={(e) => setBioForm({ ...bioForm, profilePictureUrl: e.target.value })}
                                placeholder="https://example.com/my-photo.jpg"
                            />
                            <p className="text-xs text-slate-500 mt-1">Enter a URL to your profile picture</p>

                            {/* Preview */}
                            {bioForm.profilePictureUrl && (
                                <div className="mt-3 flex items-center gap-4">
                                    <span className="text-sm text-slate-600">Preview:</span>
                                    <div className="w-16 h-16 rounded-full border-2 border-slate-300 overflow-hidden bg-slate-100">
                                        <img
                                            src={bioForm.profilePictureUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-200">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : '💾 Save Changes'}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={saving}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Personal Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Details */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span>👤</span> Personal Details
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Full Name</span>
                            <span className="font-medium text-slate-900">
                                {profile?.firstName} {profile?.middleName} {profile?.lastName}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Personal Email</span>
                            <span className="font-medium text-slate-900">{profile?.personalEmail || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Mobile Phone</span>
                            <span className="font-medium text-slate-900">{profile?.mobilePhone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Home Phone</span>
                            <span className="font-medium text-slate-900">{profile?.homePhone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Date of Birth</span>
                            <span className="font-medium text-slate-900">{formatDate(profile?.dateOfBirth)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Gender</span>
                            <span className="font-medium text-slate-900 capitalize">{profile?.gender || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Marital Status</span>
                            <span className="font-medium text-slate-900 capitalize">{profile?.maritalStatus || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-slate-600">National ID</span>
                            <span className="font-medium text-slate-900">{profile?.nationalId || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Employment Details */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span>💼</span> Employment Details
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Employee ID</span>
                            <span className="font-medium text-slate-900">{profile?.employeeId || profile?._id?.slice(-8) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Department</span>
                            <span className="font-medium text-slate-900">{profile?.department || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Position</span>
                            <span className="font-medium text-slate-900">{profile?.position || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Employment Type</span>
                            <span className="font-medium text-slate-900 capitalize">{profile?.employmentType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Hire Date</span>
                            <span className="font-medium text-slate-900">{formatDate(profile?.hireDate)}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-slate-600">Status</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${profile?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {profile?.status || 'Active'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Address Section */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span>📍</span> Address
                    </h3>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSection('contact')}
                    >
                        Edit Address
                    </Button>
                </div>
                {profile?.address && (profile.address.streetAddress || profile.address.city || profile.address.country) ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Street Address</p>
                            <p className="font-medium text-slate-900">{profile.address.streetAddress || 'Not provided'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">City</p>
                            <p className="font-medium text-slate-900">{profile.address.city || 'Not provided'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Country</p>
                            <p className="font-medium text-slate-900">{profile.address.country || 'Not provided'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg">
                        <p className="text-slate-500 mb-2">No address information available</p>
                        <Button size="sm" onClick={() => setEditingSection('contact')}>
                            Add Address
                        </Button>
                    </div>
                )}
            </div>

            {/* Biography Section */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span>📄</span> Biography
                    </h3>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSection('bio')}
                    >
                        {profile?.biography ? 'Edit Bio' : 'Add Bio'}
                    </Button>
                </div>
                {profile?.biography ? (
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{profile.biography}</p>
                ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg">
                        <p className="text-slate-500 mb-2">No biography added yet</p>
                        <Button size="sm" onClick={() => setEditingSection('bio')}>
                            Add Biography
                        </Button>
                    </div>
                )}
            </div>

            {/* Emergency Contacts Summary */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span>🚨</span> Emergency Contacts
                    </h3>
                    <Link href="/dashboard/department-employee/employee-profile/emergency-contacts">
                        <Button size="sm" variant="outline">
                            Manage Contacts
                        </Button>
                    </Link>
                </div>
                {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profile.emergencyContacts.slice(0, 3).map((contact, index) => (
                            <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-slate-900">{contact.name}</span>
                                    {contact.isPrimary && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Primary</span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600">{contact.relationship}</p>
                                <p className="text-sm text-slate-500 mt-1">{contact.phone}</p>
                            </div>
                        ))}
                        {profile.emergencyContacts.length > 3 && (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
                                <Link href="/dashboard/department-employee/employee-profile/emergency-contacts">
                                    <span className="text-blue-600 hover:text-blue-800 font-medium">
                                        +{profile.emergencyContacts.length - 3} more →
                                    </span>
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg">
                        <p className="text-slate-500 mb-2">No emergency contacts added</p>
                        <Link href="/dashboard/department-employee/employee-profile/emergency-contacts">
                            <Button size="sm">Add Emergency Contact</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
