'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

// ==================== INTERFACES ====================
interface Offer {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  department: string;
  salary: number;
  startDate: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'accepted' | 'declined';
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

interface CommunicationLog {
  id: string;
  offerId: string;
  type: 'email' | 'system' | 'note';
  message: string;
  timestamp: string;
  user: string;
}

// ==================== MOCK DATA ====================
const mockOffers: Offer[] = [
  {
    id: '1',
    candidateName: 'Ahmed Hassan',
    candidateEmail: 'ahmed.hassan@email.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    salary: 25000,
    startDate: '2026-01-15',
    status: 'pending_approval',
    createdAt: '2025-12-10',
    createdBy: 'Sarah Mohamed',
  },
  {
    id: '2',
    candidateName: 'Fatima Ali',
    candidateEmail: 'fatima.ali@email.com',
    jobTitle: 'Product Manager',
    department: 'Product',
    salary: 35000,
    startDate: '2026-01-20',
    status: 'pending_approval',
    createdAt: '2025-12-12',
    createdBy: 'Mohamed Ahmed',
  },
  {
    id: '3',
    candidateName: 'Omar Khalil',
    candidateEmail: 'omar.khalil@email.com',
    jobTitle: 'Marketing Specialist',
    department: 'Marketing',
    salary: 18000,
    startDate: '2026-02-01',
    status: 'approved',
    createdAt: '2025-12-08',
    createdBy: 'Sarah Mohamed',
    approvedBy: 'HR Manager',
    approvedAt: '2025-12-09',
  },
  {
    id: '4',
    candidateName: 'Nour Ibrahim',
    candidateEmail: 'nour.ibrahim@email.com',
    jobTitle: 'HR Coordinator',
    department: 'Human Resources',
    salary: 15000,
    startDate: '2026-01-10',
    status: 'sent',
    createdAt: '2025-12-05',
    createdBy: 'Mohamed Ahmed',
    approvedBy: 'HR Manager',
    approvedAt: '2025-12-06',
  },
  {
    id: '5',
    candidateName: 'Youssef Mansour',
    candidateEmail: 'youssef.m@email.com',
    jobTitle: 'Financial Analyst',
    department: 'Finance',
    salary: 22000,
    startDate: '2026-01-25',
    status: 'accepted',
    createdAt: '2025-12-01',
    createdBy: 'Sarah Mohamed',
    approvedBy: 'HR Manager',
    approvedAt: '2025-12-02',
  },
  {
    id: '6',
    candidateName: 'Layla Mahmoud',
    candidateEmail: 'layla.m@email.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    salary: 24000,
    startDate: '2026-01-15',
    status: 'rejected',
    createdAt: '2025-12-03',
    createdBy: 'Mohamed Ahmed',
    rejectionReason: 'Budget constraints for this quarter',
  },
];

const mockCommunicationLogs: CommunicationLog[] = [
  { id: '1', offerId: '1', type: 'system', message: 'Offer created and submitted for approval', timestamp: '2025-12-10 09:30', user: 'Sarah Mohamed' },
  { id: '2', offerId: '3', type: 'system', message: 'Offer approved by HR Manager', timestamp: '2025-12-09 14:15', user: 'HR Manager' },
  { id: '3', offerId: '3', type: 'email', message: 'Offer letter sent to candidate', timestamp: '2025-12-09 14:30', user: 'System' },
  { id: '4', offerId: '4', type: 'email', message: 'Offer letter sent to candidate', timestamp: '2025-12-07 10:00', user: 'System' },
  { id: '5', offerId: '5', type: 'system', message: 'Candidate accepted the offer', timestamp: '2025-12-05 16:45', user: 'System' },
];

// ==================== MAIN COMPONENT ====================
export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showLogsPanel, setShowLogsPanel] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setOffers(mockOffers);
      setLogs(mockCommunicationLogs);
      setLoading(false);
    };
    fetchData();
  }, []);

  // ==================== HANDLERS ====================
  const handleApprove = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowApprovalModal(true);
  };

  const handleReject = (offer: Offer) => {
    setSelectedOffer(offer);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmApproval = () => {
    if (!selectedOffer) return;

    setOffers((prev) =>
      prev.map((o) =>
        o.id === selectedOffer.id
          ? {
              ...o,
              status: 'approved',
              approvedBy: 'HR Manager',
              approvedAt: new Date().toISOString().split('T')[0],
            }
          : o
      )
    );

    // Add log
    const newLog: CommunicationLog = {
      id: Date.now().toString(),
      offerId: selectedOffer.id,
      type: 'system',
      message: 'Offer approved by HR Manager',
      timestamp: new Date().toLocaleString(),
      user: 'HR Manager',
    };
    setLogs((prev) => [newLog, ...prev]);

    setShowApprovalModal(false);
    setSelectedOffer(null);
  };

  const confirmRejection = () => {
    if (!selectedOffer || !rejectionReason.trim()) return;

    setOffers((prev) =>
      prev.map((o) =>
        o.id === selectedOffer.id
          ? { ...o, status: 'rejected', rejectionReason }
          : o
      )
    );

    // Add log
    const newLog: CommunicationLog = {
      id: Date.now().toString(),
      offerId: selectedOffer.id,
      type: 'system',
      message: `Offer rejected: ${rejectionReason}`,
      timestamp: new Date().toLocaleString(),
      user: 'HR Manager',
    };
    setLogs((prev) => [newLog, ...prev]);

    setShowRejectModal(false);
    setSelectedOffer(null);
    setRejectionReason('');
  };

  // ==================== FILTERING ====================
  const filteredOffers = offers.filter((offer) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return offer.status === 'pending_approval';
    if (filter === 'approved') return offer.status === 'approved';
    if (filter === 'sent') return offer.status === 'sent';
    if (filter === 'accepted') return offer.status === 'accepted';
    if (filter === 'rejected') return offer.status === 'rejected' || offer.status === 'declined';
    return true;
  });

  const pendingCount = offers.filter((o) => o.status === 'pending_approval').length;

  // ==================== STATUS HELPERS ====================
  const getStatusBadge = (status: Offer['status']) => {
    const styles: Record<Offer['status'], string> = {
      pending_approval: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      sent: 'bg-purple-100 text-purple-700',
      accepted: 'bg-emerald-100 text-emerald-700',
      declined: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<Offer['status'], string> = {
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      sent: 'Sent to Candidate',
      accepted: 'Accepted',
      declined: 'Declined',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
            <span>Offers</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Offer Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve job offers (BR-26)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLogsPanel(!showLogsPanel)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {showLogsPanel ? 'Hide Logs' : 'View Logs'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Pending', count: offers.filter((o) => o.status === 'pending_approval').length, color: 'bg-amber-500' },
          { label: 'Approved', count: offers.filter((o) => o.status === 'approved').length, color: 'bg-blue-500' },
          { label: 'Sent', count: offers.filter((o) => o.status === 'sent').length, color: 'bg-purple-500' },
          { label: 'Accepted', count: offers.filter((o) => o.status === 'accepted').length, color: 'bg-emerald-500' },
          { label: 'Rejected', count: offers.filter((o) => o.status === 'rejected' || o.status === 'declined').length, color: 'bg-red-500' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-white rounded-lg border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow ${
              filter === stat.label.toLowerCase() ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setFilter(stat.label.toLowerCase())}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
              <span className="text-sm text-slate-600">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {['all', 'pending', 'approved', 'sent', 'accepted', 'rejected'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className={`grid gap-6 ${showLogsPanel ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Offers List */}
        <div className={showLogsPanel ? 'lg:col-span-2' : ''}>
          {filteredOffers.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500">No offers found</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{offer.candidateName}</h3>
                        {getStatusBadge(offer.status)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{offer.candidateEmail}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {offer.jobTitle}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {offer.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatCurrency(offer.salary)}/month
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Start: {offer.startDate}
                        </span>
                      </div>
                      {offer.rejectionReason && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
                          Reason: {offer.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {offer.status === 'pending_approval' && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(offer)}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleReject(offer)}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/hr-manager/recruitment/offers/${offer.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                    <span>Created by {offer.createdBy}</span>
                    <span>•</span>
                    <span>{offer.createdAt}</span>
                    {offer.approvedBy && (
                      <>
                        <span>•</span>
                        <span>Approved by {offer.approvedBy} on {offer.approvedAt}</span>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Communication Logs Panel (BR-37) */}
        {showLogsPanel && (
          <div className="lg:col-span-1">
            <Card title="Communication Logs" subtitle="Activity history (BR-37)">
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No logs available</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        log.type === 'email' ? 'bg-blue-100 text-blue-600' :
                        log.type === 'system' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {log.type === 'email' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : log.type === 'system' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{log.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>{log.user}</span>
                          <span>•</span>
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Approval Confirmation Modal */}
      {showApprovalModal && selectedOffer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowApprovalModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Approve Offer</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Are you sure you want to approve the offer for <strong>{selectedOffer.candidateName}</strong> 
                  for the position of <strong>{selectedOffer.jobTitle}</strong>?
                </p>
                <div className="bg-slate-50 rounded-lg p-3 mb-6 text-sm text-left">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Salary</span>
                    <span className="font-medium">{formatCurrency(selectedOffer.salary)}/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-medium">{selectedOffer.startDate}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setShowApprovalModal(false)}>
                    Cancel
                  </Button>
                  <Button fullWidth onClick={confirmApproval}>
                    Confirm Approval
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedOffer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Reject Offer</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Please provide a reason for rejecting this offer for <strong>{selectedOffer.candidateName}</strong>.
                </p>
                <textarea
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                  rows={3}
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setShowRejectModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" fullWidth onClick={confirmRejection} disabled={!rejectionReason.trim()}>
                    Confirm Rejection
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
