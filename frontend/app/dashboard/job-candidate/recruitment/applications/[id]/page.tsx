'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// =====================================================
// TypeScript Interfaces
// =====================================================

type ApplicationStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

interface Interview {
  id: string;
  stage: string;
  scheduledDate: string;
  scheduledTime: string;
  mode: 'online' | 'onsite';
  location?: string;
  videoLink?: string;
  interviewers: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: string;
}

interface Offer {
  id: string;
  salary: number;
  currency: string;
  benefits: string[];
  startDate: string;
  deadline: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  documentUrl?: string;
}

interface ApplicationDetails {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  location: string;
  appliedDate: string;
  currentStage: ApplicationStage;
  status: 'active' | 'on-hold' | 'closed';
  stageHistory: {
    stage: ApplicationStage;
    date: string;
    notes?: string;
  }[];
  interviews: Interview[];
  offer?: Offer;
  rejectionReason?: string;
  communicationLogs: {
    id: string;
    type: 'email' | 'system';
    subject: string;
    date: string;
    read: boolean;
  }[];
}

// =====================================================
// Stage Configuration
// =====================================================

const STAGES: { key: ApplicationStage; label: string; icon: string }[] = [
  { key: 'applied', label: 'Applied', icon: '📄' },
  { key: 'screening', label: 'Screening', icon: '🔍' },
  { key: 'interview', label: 'Interview', icon: '💬' },
  { key: 'offer', label: 'Offer', icon: '📋' },
  { key: 'hired', label: 'Hired', icon: '✅' },
];

// =====================================================
// Mock Data
// =====================================================

const mockApplicationData: ApplicationDetails = {
  id: 'app-001',
  jobId: 'job-001',
  jobTitle: 'Senior Software Engineer',
  department: 'Engineering',
  location: 'Cairo, Egypt',
  appliedDate: '2025-12-01T10:30:00Z',
  currentStage: 'interview',
  status: 'active',
  stageHistory: [
    { stage: 'applied', date: '2025-12-01T10:30:00Z', notes: 'Application submitted successfully' },
    { stage: 'screening', date: '2025-12-03T14:00:00Z', notes: 'CV reviewed by HR' },
    { stage: 'interview', date: '2025-12-08T09:00:00Z', notes: 'Moved to interview stage' },
  ],
  interviews: [
    {
      id: 'int-001',
      stage: 'HR Interview',
      scheduledDate: '2025-12-18',
      scheduledTime: '10:00',
      mode: 'online',
      videoLink: 'https://meet.example.com/abc123',
      interviewers: ['Sarah Ahmed (HR Manager)'],
      status: 'scheduled',
    },
    {
      id: 'int-002',
      stage: 'Technical Interview',
      scheduledDate: '2025-12-22',
      scheduledTime: '14:00',
      mode: 'onsite',
      location: 'Head Office, Building A, Room 301',
      interviewers: ['Mohamed Ali (Engineering Lead)', 'Fatma Hassan (Senior Developer)'],
      status: 'scheduled',
    },
  ],
  offer: undefined,
  communicationLogs: [
    {
      id: 'log-001',
      type: 'email',
      subject: 'Application Received - Senior Software Engineer',
      date: '2025-12-01T10:35:00Z',
      read: true,
    },
    {
      id: 'log-002',
      type: 'email',
      subject: 'Interview Invitation - HR Interview',
      date: '2025-12-08T09:15:00Z',
      read: true,
    },
    {
      id: 'log-003',
      type: 'system',
      subject: 'Technical Interview Scheduled',
      date: '2025-12-10T11:00:00Z',
      read: false,
    },
  ],
};

// Mock application with offer
const mockApplicationWithOffer: ApplicationDetails = {
  ...mockApplicationData,
  id: 'app-002',
  currentStage: 'offer',
  stageHistory: [
    ...mockApplicationData.stageHistory,
    { stage: 'offer', date: '2025-12-12T16:00:00Z', notes: 'Offer extended' },
  ],
  interviews: mockApplicationData.interviews.map(int => ({ ...int, status: 'completed' as const })),
  offer: {
    id: 'offer-001',
    salary: 25000,
    currency: 'EGP',
    benefits: ['Health Insurance', 'Annual Bonus', 'Remote Work Options', '21 Days PTO'],
    startDate: '2026-01-15',
    deadline: '2025-12-25',
    status: 'pending',
    documentUrl: '/documents/offer-letter.pdf',
  },
};

// Simulated API call
const fetchApplicationDetails = async (id: string): Promise<ApplicationDetails> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Return offer version for specific IDs to demo different states
  if (id.includes('offer') || id === 'app-002') {
    return mockApplicationWithOffer;
  }
  
  return { ...mockApplicationData, id };
};

// =====================================================
// Utility Functions
// =====================================================

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStageIndex = (stage: ApplicationStage): number => {
  if (stage === 'rejected') return -1;
  return STAGES.findIndex(s => s.key === stage);
};

const getDaysUntil = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// =====================================================
// Icons
// =====================================================

const CalendarIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LocationIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const VideoIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const BuildingIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const DocumentIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowLeftIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const DownloadIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const MailIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

// =====================================================
// Loading Spinner
// =====================================================

const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}
    />
  );
};

// =====================================================
// Stage Progress Bar Component
// =====================================================

interface StageProgressProps {
  currentStage: ApplicationStage;
  stageHistory: ApplicationDetails['stageHistory'];
}

const StageProgressBar = ({ currentStage, stageHistory }: StageProgressProps) => {
  const currentIndex = getStageIndex(currentStage);
  const isRejected = currentStage === 'rejected';

  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 mx-8 hidden sm:block">
        <div
          className={`h-full transition-all duration-500 ${
            isRejected ? 'bg-red-500' : 'bg-indigo-600'
          }`}
          style={{
            width: isRejected
              ? '100%'
              : currentIndex >= 0
              ? `${(currentIndex / (STAGES.length - 1)) * 100}%`
              : '0%',
          }}
        />
      </div>

      {/* Stages */}
      <div className="flex flex-col sm:flex-row sm:justify-between relative">
        {STAGES.map((stage, index) => {
          const isCompleted = !isRejected && index < currentIndex;
          const isCurrent = !isRejected && index === currentIndex;
          const historyEntry = stageHistory.find(h => h.stage === stage.key);

          return (
            <div
              key={stage.key}
              className={`flex sm:flex-col items-center gap-3 sm:gap-2 mb-4 sm:mb-0 ${
                index <= currentIndex || isRejected ? 'opacity-100' : 'opacity-50'
              }`}
            >
              {/* Stage Circle */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold z-10 transition-all ${
                  isRejected && stage.key === 'hired'
                    ? 'bg-red-100 border-2 border-red-500 text-red-500'
                    : isCompleted
                    ? 'bg-indigo-600 text-white'
                    : isCurrent
                    ? 'bg-indigo-100 border-2 border-indigo-600 text-indigo-600'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isRejected && stage.key === 'hired' ? (
                  '❌'
                ) : isCompleted ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  stage.icon
                )}
              </div>

              {/* Stage Info */}
              <div className="flex-1 sm:flex-none sm:text-center">
                <p
                  className={`font-medium text-sm ${
                    isCurrent ? 'text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  {stage.label}
                </p>
                {historyEntry && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(historyEntry.date)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejected Banner */}
      {isRejected && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-semibold text-red-700">Application Not Successful</p>
              <p className="text-sm text-red-600 mt-1">
                We appreciate your interest. Unfortunately, we&apos;ve decided to move forward
                with other candidates. (BR-36)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// Interview Card Component
// =====================================================

interface InterviewCardProps {
  interview: Interview;
}

const InterviewCard = ({ interview }: InterviewCardProps) => {
  const isUpcoming = interview.status === 'scheduled';
  const daysUntil = getDaysUntil(interview.scheduledDate);

  return (
    <div
      className={`border rounded-lg p-4 ${
        isUpcoming
          ? 'border-indigo-200 bg-indigo-50'
          : interview.status === 'completed'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">{interview.stage}</h4>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${
              interview.status === 'scheduled'
                ? 'bg-blue-100 text-blue-700'
                : interview.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
          </span>
        </div>
        {isUpcoming && daysUntil > 0 && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
            In {daysUntil} day{daysUntil > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <span>{formatDate(interview.scheduledDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <ClockIcon className="w-4 h-4 text-slate-400" />
          <span>{formatTime(interview.scheduledTime)}</span>
        </div>

        {interview.mode === 'online' ? (
          <div className="flex items-center gap-2 text-slate-600">
            <VideoIcon className="w-4 h-4 text-slate-400" />
            <span>Online Interview</span>
            {interview.videoLink && isUpcoming && (
              <a
                href={interview.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline ml-2"
              >
                Join Meeting →
              </a>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 text-slate-600">
            <LocationIcon className="w-4 h-4 text-slate-400 mt-0.5" />
            <span>{interview.location || 'Location TBD'}</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-slate-600">
          <UsersIcon className="w-4 h-4 text-slate-400 mt-0.5" />
          <div>
            <span className="font-medium">Interviewers:</span>
            <ul className="mt-1">
              {interview.interviewers.map((interviewer, idx) => (
                <li key={idx} className="text-slate-500">
                  • {interviewer}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// Offer Section Component
// =====================================================

interface OfferSectionProps {
  offer: Offer;
  onAccept: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

const OfferSection = ({ offer, onAccept, onReject, isProcessing }: OfferSectionProps) => {
  const daysUntilDeadline = getDaysUntil(offer.deadline);
  const isExpired = daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline <= 3 && daysUntilDeadline >= 0;

  const getStatusBadge = () => {
    switch (offer.status) {
      case 'accepted':
        return <span className="badge-approved">Accepted</span>;
      case 'rejected':
        return <span className="badge-rejected">Rejected</span>;
      case 'expired':
        return <span className="badge-inactive">Expired</span>;
      default:
        return <span className="badge-pending">Pending Response</span>;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Job Offer</h3>
        {getStatusBadge()}
      </div>

      {offer.status === 'pending' && (
        <>
          {isExpired ? (
            <div className="alert-error mb-4">
              <p className="font-medium">This offer has expired</p>
              <p className="text-sm mt-1">
                The deadline was {formatDate(offer.deadline)}. Please contact HR if you&apos;re
                still interested.
              </p>
            </div>
          ) : isUrgent ? (
            <div className="alert-warning mb-4">
              <p className="font-medium">
                ⏰ Response Required - {daysUntilDeadline} day{daysUntilDeadline !== 1 ? 's' : ''}{' '}
                remaining
              </p>
              <p className="text-sm mt-1">Please respond by {formatDate(offer.deadline)}</p>
            </div>
          ) : (
            <div className="alert-info mb-4">
              <p className="text-sm">
                Please review and respond to this offer by{' '}
                <strong>{formatDate(offer.deadline)}</strong>
              </p>
            </div>
          )}
        </>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Monthly Salary</p>
          <p className="text-2xl font-bold text-slate-900">
            {offer.salary.toLocaleString()} {offer.currency}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Proposed Start Date</p>
          <p className="text-lg font-semibold text-slate-900">{formatDate(offer.startDate)}</p>
        </div>
      </div>

      {offer.benefits.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-slate-900 mb-2">Benefits Package</h4>
          <div className="flex flex-wrap gap-2">
            {offer.benefits.map((benefit, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {benefit}
              </span>
            ))}
          </div>
        </div>
      )}

      {offer.documentUrl && (
        <div className="mb-6">
          <a
            href={offer.documentUrl}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <DocumentIcon className="w-5 h-5" />
            <span>View Full Offer Letter</span>
            <DownloadIcon className="w-4 h-4" />
          </a>
        </div>
      )}

      {offer.status === 'pending' && !isExpired && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={onAccept}
            disabled={isProcessing}
            className="btn-success flex-1 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
            <span>Accept Offer</span>
          </button>
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            {isProcessing ? <LoadingSpinner size="sm" /> : <XCircleIcon className="w-5 h-5" />}
            <span>Decline Offer</span>
          </button>
        </div>
      )}

      {offer.status === 'accepted' && (
        <div className="status-container-approved">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-700">Congratulations!</p>
              <p className="text-sm text-emerald-600 mt-1">
                You&apos;ve accepted this offer. Our HR team will reach out with next steps.
              </p>
            </div>
          </div>
        </div>
      )}

      {offer.status === 'rejected' && (
        <div className="status-container-rejected">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-700">Offer Declined</p>
              <p className="text-sm text-red-600 mt-1">
                You&apos;ve declined this offer. We appreciate your consideration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// Main Component
// =====================================================

export default function ApplicationStatusPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [processingOffer, setProcessingOffer] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<'accept' | 'reject' | null>(null);

  // Load application details
  useEffect(() => {
    const loadApplication = async () => {
      try {
        setLoading(true);
        const data = await fetchApplicationDetails(applicationId);
        setApplication(data);
      } catch (error) {
        console.error('Failed to load application:', error);
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  // Handle offer response
  const handleOfferResponse = async (response: 'accepted' | 'rejected') => {
    if (!application?.offer) return;

    setProcessingOffer(true);
    setShowConfirmModal(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setApplication(prev =>
        prev
          ? {
              ...prev,
              offer: prev.offer ? { ...prev.offer, status: response } : undefined,
              currentStage: response === 'accepted' ? 'hired' : prev.currentStage,
              stageHistory:
                response === 'accepted'
                  ? [
                      ...prev.stageHistory,
                      {
                        stage: 'hired' as ApplicationStage,
                        date: new Date().toISOString(),
                        notes: 'Offer accepted',
                      },
                    ]
                  : prev.stageHistory,
            }
          : null
      );
    } catch (error) {
      console.error('Failed to respond to offer:', error);
    } finally {
      setProcessingOffer(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  // Application not found
  if (!application) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Application Not Found</h2>
          <p className="text-slate-600 mb-6">
            We couldn&apos;t find this application. It may have been removed or the link is
            incorrect.
          </p>
          <Link href="/dashboard/job-candidate" className="btn-primary inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/job-candidate"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="page-header mb-2">{application.jobTitle}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <span className="flex items-center gap-1">
              <BuildingIcon className="w-4 h-4" />
              {application.department}
            </span>
            <span className="flex items-center gap-1">
              <LocationIcon className="w-4 h-4" />
              {application.location}
            </span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              Applied {formatDate(application.appliedDate)}
            </span>
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            application.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : application.status === 'on-hold'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
        </div>
      </div>

      {/* Stage Progress - BR-27 */}
      <div className="card">
        <h2 className="section-title">Application Progress</h2>
        <StageProgressBar
          currentStage={application.currentStage}
          stageHistory={application.stageHistory}
        />
      </div>

      {/* Interviews Section */}
      {application.interviews.length > 0 && (
        <div className="card">
          <h2 className="section-title">Interviews</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {application.interviews.map(interview => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
          </div>
          {application.interviews.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No interviews scheduled yet.</p>
              <p className="text-sm mt-1">We&apos;ll notify you when an interview is scheduled.</p>
            </div>
          )}
        </div>
      )}

      {/* Offer Section */}
      {application.offer && (
        <OfferSection
          offer={application.offer}
          onAccept={() => setShowConfirmModal('accept')}
          onReject={() => setShowConfirmModal('reject')}
          isProcessing={processingOffer}
        />
      )}

      {/* Communication History */}
      <div className="card">
        <h2 className="section-title">Communication History</h2>
        {application.communicationLogs.length > 0 ? (
          <div className="space-y-3">
            {application.communicationLogs.map(log => (
              <div
                key={log.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  log.read ? 'bg-white' : 'bg-blue-50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    log.type === 'email' ? 'bg-indigo-100' : 'bg-slate-100'
                  }`}
                >
                  {log.type === 'email' ? (
                    <MailIcon className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <DocumentIcon className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${log.read ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>
                    {log.subject}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{formatDateTime(log.date)}</p>
                </div>
                {!log.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-2" title="Unread" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No communication history yet.</p>
          </div>
        )}
      </div>

      {/* Stage History Timeline */}
      <div className="card">
        <h2 className="section-title">Timeline</h2>
        <div className="relative">
          {application.stageHistory.map((entry, index) => (
            <div key={index} className="flex gap-4 pb-6 last:pb-0">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-indigo-600 mt-1.5" />
                {index < application.stageHistory.length - 1 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-200" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {STAGES.find(s => s.key === entry.stage)?.label || entry.stage}
                </p>
                <p className="text-sm text-slate-500">{formatDateTime(entry.date)}</p>
                {entry.notes && (
                  <p className="text-sm text-slate-600 mt-1">{entry.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {showConfirmModal === 'accept' ? 'Accept Offer' : 'Decline Offer'}
            </h3>
            <p className="text-slate-600 mb-6">
              {showConfirmModal === 'accept'
                ? 'Are you sure you want to accept this job offer? This action cannot be undone.'
                : 'Are you sure you want to decline this job offer? This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleOfferResponse(showConfirmModal === 'accept' ? 'accepted' : 'rejected')}
                className={showConfirmModal === 'accept' ? 'btn-success flex-1' : 'btn-danger flex-1'}
              >
                {showConfirmModal === 'accept' ? 'Yes, Accept' : 'Yes, Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
