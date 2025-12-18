'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Button } from '@/app/components/ui/button';
import { StatusBadge } from '@/app/components/ui/status-badge';

export default function EmployeeProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await employeeProfileService.getMyProfile();
                setProfile(response.data);
            } catch (err: any) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <p className="text-destructive font-medium">Error: {error}</p>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="space-y-6">
            {/* Header with Edit Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
                    <p className="text-muted-foreground">View and manage your personal information</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/portal/my-profile/correction-requests">
                        <Button variant="outline" className="shadow-sm">
                            Correction Requests
                        </Button>
                    </Link>
                    <Link href="/portal/my-profile/edit">
                        <Button className="shadow-sm gap-2">
                            Update Profile
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Profile Card */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-full border border-border overflow-hidden bg-muted/30 flex items-center justify-center shadow-inner">
                            {profile.profilePictureUrl ? (
                                <img
                                    src={profile.profilePictureUrl}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-muted-foreground/40">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">
                                    {profile.firstName} {profile.lastName}
                                </h2>
                                <div className="flex gap-3 text-sm mt-1">
                                    <span className="text-primary font-medium">{profile.primaryPositionId?.title || 'No Position'}</span>
                                    <span className="text-border">|</span>
                                    <span className="text-muted-foreground">{profile.primaryDepartmentId?.name || 'No Department'}</span>
                                </div>
                            </div>
                            <StatusBadge status={profile.status} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-6">
                            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                                <svg className="w-4 h-4 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                {profile.workEmail}
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                                <svg className="w-4 h-4 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="7" y1="16" x2="13" y2="16" /></svg>
                                {profile.employeeNumber}
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                                <svg className="w-4 h-4 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                Hired: {new Date(profile.dateOfHire).toLocaleDateString()}
                            </div>
                            {profile.mobilePhone && (
                                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                                    <svg className="w-4 h-4 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>
                                    {profile.mobilePhone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Biography */}
                    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                        <h3 className="font-bold text-lg text-foreground mb-4 border-b border-border pb-2">Biography</h3>
                        <p className="text-muted-foreground whitespace-pre-line">
                            {profile.biography || 'No biography details provided.'}
                        </p>
                    </div>

                    {/* Employment Details */}
                    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                        <h3 className="font-bold text-lg text-foreground mb-4 border-b border-border pb-2">Employment Details</h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Contract Type</dt>
                                <dd className="text-sm font-medium text-foreground mt-1">{profile.contractType || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Work Type</dt>
                                <dd className="text-sm font-medium text-foreground mt-1">{profile.workType || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Contract Start</dt>
                                <dd className="text-sm font-medium text-foreground mt-1">
                                    {profile.contractStartDate ? new Date(profile.contractStartDate).toLocaleDateString() : '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Contract End</dt>
                                <dd className="text-sm font-medium text-foreground mt-1">
                                    {profile.contractEndDate ? new Date(profile.contractEndDate).toLocaleDateString() : '-'}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Education */}
                    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                        <h3 className="font-bold text-lg text-foreground mb-4 border-b border-border pb-2">Education</h3>
                        {profile.education && profile.education.length > 0 ? (
                            <div className="space-y-4">
                                {profile.education.map((edu: any, i: number) => (
                                    <div key={i} className="border-b border-muted last:border-0 pb-3 last:pb-0">
                                        <div className="font-medium text-foreground">{edu.establishmentName}</div>
                                        <div className="text-sm text-muted-foreground">{edu.graduationType}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No education details added.</p>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Personal Info */}
                    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                        <h3 className="font-bold text-lg text-foreground mb-4 border-b border-border pb-2">Personal Info</h3>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Personal Email</dt>
                                <dd className="text-sm font-medium text-foreground mt-1 break-all">{profile.personalEmail || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Home Phone</dt>
                                <dd className="text-sm font-medium text-foreground mt-1">{profile.homePhone || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Date of Birth</dt>
                                <dd className="text-sm font-medium text-foreground mt-1">
                                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold">Address</dt>
                                <dd className="text-sm font-medium text-foreground mt-1">
                                    {profile.address ? (
                                        <>
                                            {profile.address.streetAddress}<br />
                                            {profile.address.city}, {profile.address.country}
                                        </>
                                    ) : '-'}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Emergency Contacts */}
                    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                        <h3 className="font-bold text-lg text-foreground mb-4 border-b border-border pb-2">Emergency Contacts</h3>
                        {profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                            <div className="space-y-4">
                                {profile.emergencyContacts.map((contact: any, i: number) => (
                                    <div key={i} className={`p-3 rounded-lg border ${contact.isPrimary ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/50'}`}>
                                        <div className="font-medium text-sm text-foreground">{contact.name}</div>
                                        <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 bg-background/50 p-1.5 rounded border border-border/40">
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.81 12.81 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                            {contact.phone}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No contacts added.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}