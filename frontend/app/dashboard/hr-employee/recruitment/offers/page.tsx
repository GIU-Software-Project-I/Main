'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { OfferResponseStatus, OfferFinalStatus } from '@/app/types/enums';

// =====================================================
// Types
// =====================================================

interface CandidateForOffer {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  departmentName: string;
  averageScore: number;
}

interface JobOffer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  departmentName: string;
  grossSalary: number;
  signingBonus?: number;
  benefits: string[];
  startDate: string;
  deadline: string;
  applicantResponse: OfferResponseStatus;
  finalStatus: OfferFinalStatus;
  sentAt?: string;
  respondedAt?: string;
  preboardingTriggered: boolean;
  createdAt: string;
}

interface NewOffer {
  applicationId: string;
  grossSalary: number;
  signingBonus: number;
  benefits: string[];
  startDate: string;
  deadline: string;
  conditions: string;
}

// =====================================================
// Mock Data
// =====================================================

const mockCandidatesForOffer: CandidateForOffer[] = [
  {
    id: '4',
    applicationId: 'APP-2024-004',
    candidateName: 'Fatima Ibrahim',
    candidateEmail: 'fatima.ibrahim@email.com',
    jobTitle: 'UX Designer',
    departmentName: 'Design',
    averageScore: 95,
  },
  {
    id: '3',
    applicationId: 'APP-2024-003',
    candidateName: 'Omar Khaled',
    candidateEmail: 'omar.khaled@email.com',
    jobTitle: 'Product Manager',
    departmentName: 'Product',
    averageScore: 92,
  },
];

const mockOffers: JobOffer[] = [
  {
    id: 'offer-1',
    applicationId: '1',
    candidateId: 'CAND-001',
    candidateName: 'Ahmed Mohamed',
    candidateEmail: 'ahmed.mohamed@email.com',
    positionTitle: 'Senior Software Engineer',
    departmentName: 'Engineering',
    grossSalary: 25000,
    signingBonus: 5000,
    benefits: ['Health Insurance', 'Remote Work', 'Annual Bonus'],
    startDate: '2025-01-15',
    deadline: '2024-12-25',
    applicantResponse: OfferResponseStatus.ACCEPTED,
    finalStatus: OfferFinalStatus.APPROVED,
    sentAt: '2024-12-10',
    respondedAt: '2024-12-12',
    preboardingTriggered: true,
    createdAt: '2024-12-10',
  },
  {
    id: 'offer-2',
    applicationId: '5',
    candidateId: 'CAND-005',
    candidateName: 'Youssef Gamal',
    candidateEmail: 'youssef.gamal@email.com',
    positionTitle: 'Junior Developer',
    departmentName: 'Engineering',
    grossSalary: 12000,
    benefits: ['Health Insurance', 'Learning Budget'],
    startDate: '2025-02-01',
    deadline: '2024-12-30',
    applicantResponse: OfferResponseStatus.PENDING,
    finalStatus: OfferFinalStatus.PENDING,
    sentAt: '2024-12-15',
    preboardingTriggered: false,
    createdAt: '2024-12-14',
  },
  {
    id: 'offer-3',
    applicationId: '7',
    candidateId: 'CAND-007',
    candidateName: 'Karim Sayed',
    candidateEmail: 'karim.sayed@email.com',
    positionTitle: 'Product Manager',
    departmentName: 'Product',
    grossSalary: 22000,
    signingBonus: 3000,
    benefits: ['Health Insurance', 'Stock Options'],
    startDate: '2025-01-10',
    deadline: '2024-12-20',
    applicantResponse: OfferResponseStatus.REJECTED,
    finalStatus: OfferFinalStatus.REJECTED,
    sentAt: '2024-12-05',
    respondedAt: '2024-12-08',
    preboardingTriggered: false,
    createdAt: '2024-12-05',
  },
];

const availableBenefits = [
  'Health Insurance',
  'Dental Insurance',
  'Life Insurance',
  'Remote Work',
  'Flexible Hours',
  'Annual Bonus',
  'Performance Bonus',
  'Stock Options',
  'Learning Budget',
  'Gym Membership',
  'Transportation Allowance',
  'Meal Allowance',
];

// =====================================================
// Components
// =====================================================

function OfferStatusBadge({ status }: { status: OfferResponseStatus }) {
  const config = {
    [OfferResponseStatus.PENDING]: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    [OfferResponseStatus.ACCEPTED]: { label: 'Accepted', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    [OfferResponseStatus.REJECTED]: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
  };
  
  const { label, color } = config[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

function PreboardingButton({
  offer,
  onTrigger,
  isTriggering,
}: {
  offer: JobOffer;
  onTrigger: (offerId: string) => void;
  isTriggering: boolean;
}) {
  if (offer.applicantResponse !== OfferResponseStatus.ACCEPTED) {
    return null;
  }

  if (offer.preboardingTriggered) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Pre-boarding Started
      </span>
    );
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={() => onTrigger(offer.id)}
      isLoading={isTriggering}
    >
      Trigger Pre-boarding
    </Button>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function OffersPage() {
  const searchParams = useSearchParams();
  const preselectedAppId = searchParams.get('applicationId');

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateForOffer[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newOffer, setNewOffer] = useState<NewOffer>({
    applicationId: preselectedAppId || '',
    grossSalary: 0,
    signingBonus: 0,
    benefits: [],
    startDate: '',
    deadline: '',
    conditions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setCandidates(mockCandidatesForOffer);
      setOffers(mockOffers);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-open form if applicationId is provided
  useEffect(() => {
    if (preselectedAppId && !loading) {
      setShowCreateForm(true);
      setNewOffer((prev) => ({ ...prev, applicationId: preselectedAppId }));
    }
  }, [preselectedAppId, loading]);

  // Toggle benefit selection
  const toggleBenefit = (benefit: string) => {
    setNewOffer((prev) => ({
      ...prev,
      benefits: prev.benefits.includes(benefit)
        ? prev.benefits.filter((b) => b !== benefit)
        : [...prev.benefits, benefit],
    }));
  };

  // Validate form (BR-26)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newOffer.applicationId) {
      newErrors.applicationId = 'Please select a candidate';
    }

    if (!newOffer.grossSalary || newOffer.grossSalary <= 0) {
      newErrors.grossSalary = 'Please enter a valid salary';
    }

    if (!newOffer.startDate) {
      newErrors.startDate = 'Please select a start date';
    } else if (new Date(newOffer.startDate) < new Date()) {
      newErrors.startDate = 'Start date must be in the future';
    }

    if (!newOffer.deadline) {
      newErrors.deadline = 'Please select a response deadline';
    } else if (new Date(newOffer.deadline) < new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    if (newOffer.benefits.length === 0) {
      newErrors.benefits = 'Please select at least one benefit';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create offer (BR-26)
  const handleCreateOffer = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const selectedCandidate = candidates.find((c) => c.applicationId === newOffer.applicationId);
    
    if (selectedCandidate) {
      const newOfferData: JobOffer = {
        id: `offer-${Date.now()}`,
        applicationId: newOffer.applicationId,
        candidateId: selectedCandidate.id,
        candidateName: selectedCandidate.candidateName,
        candidateEmail: selectedCandidate.candidateEmail,
        positionTitle: selectedCandidate.jobTitle,
        departmentName: selectedCandidate.departmentName,
        grossSalary: newOffer.grossSalary,
        signingBonus: newOffer.signingBonus || undefined,
        benefits: newOffer.benefits,
        startDate: newOffer.startDate,
        deadline: newOffer.deadline,
        applicantResponse: OfferResponseStatus.PENDING,
        finalStatus: OfferFinalStatus.PENDING,
        preboardingTriggered: false,
        createdAt: new Date().toISOString(),
      };

      setOffers((prev) => [newOfferData, ...prev]);
      
      // Remove candidate from list
      setCandidates((prev) => prev.filter((c) => c.applicationId !== newOffer.applicationId));
    }

    setIsCreating(false);
    setShowCreateForm(false);
    setNewOffer({
      applicationId: '',
      grossSalary: 0,
      signingBonus: 0,
      benefits: [],
      startDate: '',
      deadline: '',
      conditions: '',
    });

    setSuccessMessage('Offer created successfully! You can now send it to the candidate.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Send offer
  const handleSendOffer = async (offerId: string) => {
    setIsSending(offerId);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setOffers((prev) =>
      prev.map((offer) =>
        offer.id === offerId
          ? { ...offer, sentAt: new Date().toISOString() }
          : offer
      )
    );

    setIsSending(null);
    setSuccessMessage('Offer sent to candidate successfully!');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Trigger pre-boarding (REC-029)
  const handleTriggerPreboarding = async (offerId: string) => {
    setIsTriggering(offerId);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setOffers((prev) =>
      prev.map((offer) =>
        offer.id === offerId ? { ...offer, preboardingTriggered: true } : offer
      )
    );

    setIsTriggering(null);
    setSuccessMessage('Pre-boarding tasks have been triggered! The onboarding module has been notified.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Stats
  const stats = {
    total: offers.length,
    pending: offers.filter((o) => o.applicantResponse === OfferResponseStatus.PENDING).length,
    accepted: offers.filter((o) => o.applicantResponse === OfferResponseStatus.ACCEPTED).length,
    preboardingReady: offers.filter(
      (o) => o.applicantResponse === OfferResponseStatus.ACCEPTED && !o.preboardingTriggered
    ).length,
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offers Management</h1>
          <p className="text-slate-600 mt-1">
            Create, send, and track job offers to candidates
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateForm(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Offer
        </Button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-emerald-800 font-medium">{successMessage}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Offers</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Pending Response</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Accepted</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.accepted}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Awaiting Pre-boarding</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.preboardingReady}</p>
        </div>
      </div>

      {/* Create Offer Form (BR-26) */}
      {showCreateForm && (
        <Card className="mb-6" title="Create New Offer">
          <div className="space-y-6">
            {/* Select Candidate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Candidate <span className="text-red-500">*</span>
              </label>
              {candidates.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-slate-600">
                  No candidates at the offer stage. Move candidates through the pipeline first.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => setNewOffer({ ...newOffer, applicationId: candidate.applicationId })}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        newOffer.applicationId === candidate.applicationId
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{candidate.candidateName}</p>
                          <p className="text-sm text-slate-500">{candidate.jobTitle}</p>
                          <p className="text-xs text-slate-400">{candidate.departmentName}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${candidate.averageScore >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {candidate.averageScore}%
                          </span>
                          <p className="text-xs text-slate-500">Score</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {errors.applicationId && (
                <p className="text-red-600 text-sm mt-1">{errors.applicationId}</p>
              )}
            </div>

            {/* Salary & Bonus */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Gross Salary (EGP/month) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={newOffer.grossSalary || ''}
                  onChange={(e) => setNewOffer({ ...newOffer, grossSalary: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 20000"
                  error={errors.grossSalary}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Signing Bonus (EGP)
                </label>
                <Input
                  type="number"
                  value={newOffer.signingBonus || ''}
                  onChange={(e) => setNewOffer({ ...newOffer, signingBonus: parseInt(e.target.value) || 0 })}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Start Date & Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Proposed Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={newOffer.startDate}
                  onChange={(e) => setNewOffer({ ...newOffer, startDate: e.target.value })}
                  error={errors.startDate}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Response Deadline <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={newOffer.deadline}
                  onChange={(e) => setNewOffer({ ...newOffer, deadline: e.target.value })}
                  error={errors.deadline}
                />
              </div>
            </div>

            {/* Benefits Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Benefits Package <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableBenefits.map((benefit) => (
                  <button
                    key={benefit}
                    onClick={() => toggleBenefit(benefit)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      newOffer.benefits.includes(benefit)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {benefit}
                  </button>
                ))}
              </div>
              {errors.benefits && (
                <p className="text-red-600 text-sm mt-1">{errors.benefits}</p>
              )}
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Conditions
              </label>
              <textarea
                value={newOffer.conditions}
                onChange={(e) => setNewOffer({ ...newOffer, conditions: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any special terms, conditions, or notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateOffer}
                isLoading={isCreating}
                disabled={candidates.length === 0}
              >
                Create Offer
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Offers List */}
      <Card title="All Offers" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Compensation
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No offers created yet.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{offer.candidateName}</p>
                      <p className="text-sm text-slate-500">{offer.candidateEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{offer.positionTitle}</p>
                      <p className="text-sm text-slate-500">{offer.departmentName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        EGP {offer.grossSalary.toLocaleString()}/mo
                      </p>
                      {offer.signingBonus && (
                        <p className="text-sm text-emerald-600">
                          + EGP {offer.signingBonus.toLocaleString()} signing bonus
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <OfferStatusBadge status={offer.applicantResponse} />
                      {offer.sentAt ? (
                        <p className="text-xs text-slate-500 mt-1">
                          Sent: {new Date(offer.sentAt).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-1">Not sent yet</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{new Date(offer.deadline).toLocaleDateString()}</p>
                      <p className="text-sm text-slate-500">Start: {new Date(offer.startDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {!offer.sentAt && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSendOffer(offer.id)}
                            isLoading={isSending === offer.id}
                          >
                            Send Offer
                          </Button>
                        )}
                        <PreboardingButton
                          offer={offer}
                          onTrigger={handleTriggerPreboarding}
                          isTriggering={isTriggering === offer.id}
                        />
                        <Link href={`/dashboard/hr-employee/recruitment/applications/${offer.applicationId}`}>
                          <Button variant="outline" size="sm">
                            View Application
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pre-boarding Info Card (REC-029) */}
      {stats.preboardingReady > 0 && (
        <Card className="mt-6 border-indigo-200 bg-indigo-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900">Pre-boarding Ready</h3>
              <p className="text-sm text-indigo-700">
                {stats.preboardingReady} accepted offer{stats.preboardingReady > 1 ? 's are' : ' is'} ready for pre-boarding. 
                Trigger pre-boarding to initiate onboarding tasks (contract signing, forms, etc.) as per REC-029.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
