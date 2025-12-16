'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

// ==================== INTERFACES ====================
interface OfferDetail {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobTitle: string;
  department: string;
  salary: number;
  bonus?: number;
  benefits: string[];
  startDate: string;
  expirationDate: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'pending_signature' | 'signed' | 'accepted' | 'declined';
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  signedAt?: string;
  rejectionReason?: string;
  declineReason?: string;
  offerLetterUrl?: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  user: string;
  status: 'completed' | 'current' | 'pending';
}

// ==================== MOCK DATA ====================
const getMockOffer = (id: string): OfferDetail => {
  const offers: Record<string, OfferDetail> = {
    '1': {
      id: '1',
      candidateName: 'Ahmed Hassan',
      candidateEmail: 'ahmed.hassan@email.com',
      candidatePhone: '+20 123 456 7890',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      salary: 25000,
      bonus: 5000,
      benefits: ['Health Insurance', 'Annual Leave (21 days)', 'Transportation Allowance', 'Professional Development Budget'],
      startDate: '2026-01-15',
      expirationDate: '2025-12-20',
      status: 'pending_approval',
      createdAt: '2025-12-10',
      createdBy: 'Sarah Mohamed',
    },
    '2': {
      id: '2',
      candidateName: 'Fatima Ali',
      candidateEmail: 'fatima.ali@email.com',
      candidatePhone: '+20 111 222 3333',
      jobTitle: 'Product Manager',
      department: 'Product',
      salary: 35000,
      bonus: 10000,
      benefits: ['Health Insurance', 'Annual Leave (25 days)', 'Company Car', 'Stock Options'],
      startDate: '2026-01-20',
      expirationDate: '2025-12-25',
      status: 'pending_approval',
      createdAt: '2025-12-12',
      createdBy: 'Mohamed Ahmed',
    },
    '3': {
      id: '3',
      candidateName: 'Omar Khalil',
      candidateEmail: 'omar.khalil@email.com',
      candidatePhone: '+20 100 200 3000',
      jobTitle: 'Marketing Specialist',
      department: 'Marketing',
      salary: 18000,
      benefits: ['Health Insurance', 'Annual Leave (21 days)', 'Performance Bonus'],
      startDate: '2026-02-01',
      expirationDate: '2025-12-30',
      status: 'pending_signature',
      createdAt: '2025-12-08',
      createdBy: 'Sarah Mohamed',
      approvedBy: 'HR Manager',
      approvedAt: '2025-12-09',
      sentAt: '2025-12-10',
    },
    '4': {
      id: '4',
      candidateName: 'Nour Ibrahim',
      candidateEmail: 'nour.ibrahim@email.com',
      candidatePhone: '+20 155 666 7777',
      jobTitle: 'HR Coordinator',
      department: 'Human Resources',
      salary: 15000,
      benefits: ['Health Insurance', 'Annual Leave (21 days)', 'Training Programs'],
      startDate: '2026-01-10',
      expirationDate: '2025-12-15',
      status: 'signed',
      createdAt: '2025-12-05',
      createdBy: 'Mohamed Ahmed',
      approvedBy: 'HR Manager',
      approvedAt: '2025-12-06',
      sentAt: '2025-12-07',
      signedAt: '2025-12-08',
      offerLetterUrl: '/documents/offer-nour-ibrahim.pdf',
    },
    '5': {
      id: '5',
      candidateName: 'Youssef Mansour',
      candidateEmail: 'youssef.m@email.com',
      candidatePhone: '+20 122 333 4444',
      jobTitle: 'Financial Analyst',
      department: 'Finance',
      salary: 22000,
      bonus: 3000,
      benefits: ['Health Insurance', 'Annual Leave (21 days)', 'CFA Certification Support'],
      startDate: '2026-01-25',
      expirationDate: '2025-12-10',
      status: 'accepted',
      createdAt: '2025-12-01',
      createdBy: 'Sarah Mohamed',
      approvedBy: 'HR Manager',
      approvedAt: '2025-12-02',
      sentAt: '2025-12-03',
      signedAt: '2025-12-04',
      offerLetterUrl: '/documents/offer-youssef-mansour.pdf',
    },
  };

  return offers[id] || {
    id,
    candidateName: 'Unknown Candidate',
    candidateEmail: 'unknown@email.com',
    candidatePhone: 'N/A',
    jobTitle: 'Unknown Position',
    department: 'Unknown',
    salary: 0,
    benefits: [],
    startDate: 'N/A',
    expirationDate: 'N/A',
    status: 'pending_approval',
    createdAt: 'N/A',
    createdBy: 'Unknown',
  };
};

const getTimelineEvents = (offer: OfferDetail): TimelineEvent[] => {
  const events: TimelineEvent[] = [
    {
      id: '1',
      action: 'Offer Created',
      description: `Offer created by ${offer.createdBy}`,
      timestamp: offer.createdAt,
      user: offer.createdBy,
      status: 'completed',
    },
  ];

  if (offer.status === 'rejected') {
    events.push({
      id: '2',
      action: 'Offer Rejected',
      description: offer.rejectionReason || 'Offer was rejected',
      timestamp: offer.approvedAt || 'N/A',
      user: offer.approvedBy || 'HR Manager',
      status: 'completed',
    });
    return events;
  }

  if (offer.approvedBy) {
    events.push({
      id: '2',
      action: 'Offer Approved',
      description: `Approved by ${offer.approvedBy}`,
      timestamp: offer.approvedAt || 'N/A',
      user: offer.approvedBy,
      status: 'completed',
    });
  } else if (offer.status === 'pending_approval') {
    events.push({
      id: '2',
      action: 'Pending Approval',
      description: 'Waiting for HR Manager approval',
      timestamp: '-',
      user: 'HR Manager',
      status: 'current',
    });
    events.push({
      id: '3',
      action: 'Send to Candidate',
      description: 'Offer will be sent after approval',
      timestamp: '-',
      user: 'System',
      status: 'pending',
    });
    events.push({
      id: '4',
      action: 'Awaiting Signature',
      description: 'Candidate will receive offer for signature',
      timestamp: '-',
      user: offer.candidateName,
      status: 'pending',
    });
    return events;
  }

  if (offer.sentAt) {
    events.push({
      id: '3',
      action: 'Offer Sent',
      description: `Sent to ${offer.candidateEmail}`,
      timestamp: offer.sentAt,
      user: 'System',
      status: 'completed',
    });
  }

  if (offer.status === 'pending_signature') {
    events.push({
      id: '4',
      action: 'Awaiting Signature',
      description: 'Candidate has received the offer',
      timestamp: '-',
      user: offer.candidateName,
      status: 'current',
    });
    return events;
  }

  if (offer.signedAt) {
    events.push({
      id: '4',
      action: 'Offer Signed',
      description: 'Candidate signed the offer letter',
      timestamp: offer.signedAt,
      user: offer.candidateName,
      status: 'completed',
    });
  }

  if (offer.status === 'accepted' || offer.status === 'signed') {
    events.push({
      id: '5',
      action: 'Ready for Onboarding',
      description: 'Candidate is ready to start onboarding process',
      timestamp: '-',
      user: 'HR Team',
      status: offer.status === 'accepted' ? 'completed' : 'pending',
    });
  }

  if (offer.status === 'declined') {
    events.push({
      id: '5',
      action: 'Offer Declined',
      description: offer.declineReason || 'Candidate declined the offer',
      timestamp: 'N/A',
      user: offer.candidateName,
      status: 'completed',
    });
  }

  return events;
};

// ==================== MAIN COMPONENT ====================
export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.id as string;

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setOffer(getMockOffer(offerId));
      setLoading(false);
    };
    fetchOffer();
  }, [offerId]);

  // ==================== STATUS HELPERS ====================
  const getStatusInfo = (status: OfferDetail['status']) => {
    const info: Record<OfferDetail['status'], { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      pending_approval: {
        label: 'Pending Approval',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      approved: {
        label: 'Approved',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      rejected: {
        label: 'Rejected',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      sent: {
        label: 'Sent',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        ),
      },
      pending_signature: {
        label: 'Pending Signature',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        ),
      },
      signed: {
        label: 'Signed',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
      },
      accepted: {
        label: 'Accepted',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
      },
      declined: {
        label: 'Declined',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
      },
    };
    return info[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  const handleTriggerOnboarding = () => {
    setShowOnboardingModal(true);
  };

  const confirmOnboarding = () => {
    // In real implementation, this would call an API to create onboarding task
    setShowOnboardingModal(false);
    // Show success and redirect
    router.push('/dashboard/hr-manager/recruitment/offers');
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Offer not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(offer.status);
  const timeline = getTimelineEvents(offer);

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
            <Link href="/dashboard/hr-manager/recruitment/offers" className="hover:text-slate-700">
              Offers
            </Link>
            <span>/</span>
            <span>{offer.candidateName}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Offer Details</h1>
          <p className="text-sm text-slate-500 mt-1">HRM-5: Offer Signature Monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
          {(offer.status === 'signed' || offer.status === 'accepted') && (
            <Button onClick={handleTriggerOnboarding}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Trigger Onboarding
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-4 p-4 rounded-xl ${statusInfo.bgColor}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.icon}
        </div>
        <div>
          <h3 className={`font-semibold ${statusInfo.color}`}>{statusInfo.label}</h3>
          <p className="text-sm text-slate-600">
            {offer.status === 'pending_signature' && 'Waiting for candidate to sign the offer letter'}
            {offer.status === 'signed' && `Signed on ${offer.signedAt}`}
            {offer.status === 'accepted' && 'Candidate has accepted and is ready for onboarding'}
            {offer.status === 'pending_approval' && 'Awaiting HR Manager approval'}
            {offer.status === 'approved' && 'Ready to be sent to candidate'}
            {offer.status === 'rejected' && offer.rejectionReason}
            {offer.status === 'declined' && (offer.declineReason || 'Candidate declined the offer')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Information */}
          <Card title="Candidate Information">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-xl font-semibold text-slate-600">
                {offer.candidateName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{offer.candidateName}</h3>
                <p className="text-slate-600">{offer.jobTitle} - {offer.department}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                  <a href={`mailto:${offer.candidateEmail}`} className="flex items-center gap-1 hover:text-blue-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {offer.candidateEmail}
                  </a>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {offer.candidatePhone}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Offer Details */}
          <Card title="Offer Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">Position</h4>
                <p className="text-slate-900 font-medium">{offer.jobTitle}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">Department</h4>
                <p className="text-slate-900 font-medium">{offer.department}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">Base Salary</h4>
                <p className="text-slate-900 font-medium text-lg">{formatCurrency(offer.salary)}/month</p>
              </div>
              {offer.bonus && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Signing Bonus</h4>
                  <p className="text-slate-900 font-medium text-lg">{formatCurrency(offer.bonus)}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">Start Date</h4>
                <p className="text-slate-900 font-medium">{offer.startDate}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">Offer Expiration</h4>
                <p className="text-slate-900 font-medium">{offer.expirationDate}</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-medium text-slate-500 mb-3">Benefits Package</h4>
              <div className="flex flex-wrap gap-2">
                {offer.benefits.map((benefit, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            {/* Download Offer Letter */}
            {offer.offerLetterUrl && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <Button variant="outline" onClick={() => window.open(offer.offerLetterUrl, '_blank')}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Offer Letter
                </Button>
              </div>
            )}
          </Card>

          {/* Signature Status */}
          {(offer.status === 'pending_signature' || offer.status === 'signed' || offer.status === 'accepted') && (
            <Card title="Signature Status">
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  offer.status === 'pending_signature' ? 'bg-orange-100' : 'bg-emerald-100'
                }`}>
                  {offer.status === 'pending_signature' ? (
                    <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {offer.status === 'pending_signature' ? 'Awaiting Candidate Signature' : 'Document Signed'}
                  </h3>
                  <p className="text-slate-600 mt-1">
                    {offer.status === 'pending_signature'
                      ? `Offer letter sent on ${offer.sentAt}. Waiting for candidate to review and sign.`
                      : `Candidate signed the offer letter on ${offer.signedAt}.`}
                  </p>
                  {offer.status === 'pending_signature' && (
                    <Button variant="outline" size="sm" className="mt-3">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Reminder
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Timeline Sidebar */}
        <div className="lg:col-span-1">
          <Card title="Timeline" subtitle="Offer lifecycle">
            <div className="relative">
              {timeline.map((event, index) => (
                <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                  {/* Line */}
                  {index < timeline.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200" style={{ top: `${index * 80 + 32}px`, height: '48px' }} />
                  )}
                  
                  {/* Dot */}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    event.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    event.status === 'current' ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {event.status === 'completed' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : event.status === 'current' ? (
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${
                      event.status === 'pending' ? 'text-slate-400' : 'text-slate-900'
                    }`}>
                      {event.action}
                    </h4>
                    <p className="text-sm text-slate-500 mt-0.5">{event.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{event.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions" className="mt-6">
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Send Email</p>
                  <p className="text-xs text-slate-500">Contact candidate</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Edit Offer</p>
                  <p className="text-xs text-slate-500">Modify terms</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Print Offer</p>
                  <p className="text-xs text-slate-500">Generate PDF</p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowOnboardingModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Trigger Onboarding</h3>
                <p className="text-sm text-slate-600 mb-6">
                  This will create an onboarding task for <strong>{offer?.candidateName}</strong> starting 
                  on <strong>{offer?.startDate}</strong>. The candidate will be notified to complete 
                  pre-boarding documents.
                </p>

                <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Onboarding will include:</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Document collection
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      IT equipment setup
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Team introduction scheduling
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Training enrollment
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setShowOnboardingModal(false)}>
                    Cancel
                  </Button>
                  <Button fullWidth onClick={confirmOnboarding}>
                    Start Onboarding
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
