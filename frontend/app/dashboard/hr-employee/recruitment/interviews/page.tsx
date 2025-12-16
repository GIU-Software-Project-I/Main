'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { ApplicationStage, InterviewMethod, InterviewStatus } from '@/app/types/enums';

// =====================================================
// Types
// =====================================================

interface PanelMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  available: boolean;
}

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface ApplicationForInterview {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  departmentName: string;
  currentStage: ApplicationStage;
}

interface ScheduledInterview {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  method: InterviewMethod;
  panelMembers: string[];
  status: InterviewStatus;
  videoLink?: string;
  location?: string;
}

interface NewInterview {
  applicationId: string;
  stage: ApplicationStage;
  selectedPanel: string[];
  selectedSlot: string;
  method: InterviewMethod;
  videoLink: string;
  location: string;
  notes: string;
}

// =====================================================
// Mock Data
// =====================================================

const mockPanelMembers: PanelMember[] = [
  { id: 'emp-001', name: 'Ahmed Hassan', role: 'Engineering Manager', department: 'Engineering', email: 'ahmed.hassan@company.com', available: true },
  { id: 'emp-002', name: 'Sara Ali', role: 'Senior Developer', department: 'Engineering', email: 'sara.ali@company.com', available: true },
  { id: 'emp-003', name: 'Mohamed Ibrahim', role: 'Tech Lead', department: 'Engineering', email: 'mohamed.ibrahim@company.com', available: false },
  { id: 'emp-004', name: 'Fatima Khalid', role: 'HR Manager', department: 'Human Resources', email: 'fatima.khalid@company.com', available: true },
  { id: 'emp-005', name: 'Omar Youssef', role: 'Product Manager', department: 'Product', email: 'omar.youssef@company.com', available: true },
  { id: 'emp-006', name: 'Nour Ahmed', role: 'UX Lead', department: 'Design', email: 'nour.ahmed@company.com', available: true },
];

const mockTimeSlots: TimeSlot[] = [
  { id: 'slot-1', date: '2024-12-18', startTime: '09:00', endTime: '10:00', available: true },
  { id: 'slot-2', date: '2024-12-18', startTime: '10:30', endTime: '11:30', available: true },
  { id: 'slot-3', date: '2024-12-18', startTime: '14:00', endTime: '15:00', available: false },
  { id: 'slot-4', date: '2024-12-19', startTime: '09:00', endTime: '10:00', available: true },
  { id: 'slot-5', date: '2024-12-19', startTime: '11:00', endTime: '12:00', available: true },
  { id: 'slot-6', date: '2024-12-20', startTime: '10:00', endTime: '11:00', available: true },
  { id: 'slot-7', date: '2024-12-20', startTime: '14:30', endTime: '15:30', available: true },
  { id: 'slot-8', date: '2024-12-23', startTime: '09:00', endTime: '10:00', available: true },
];

const mockApplicationsForInterview: ApplicationForInterview[] = [
  { id: '1', applicationId: 'APP-2024-001', candidateName: 'Ahmed Mohamed', candidateEmail: 'ahmed.mohamed@email.com', jobTitle: 'Senior Software Engineer', departmentName: 'Engineering', currentStage: ApplicationStage.DEPARTMENT_INTERVIEW },
  { id: '2', applicationId: 'APP-2024-002', candidateName: 'Sara Hassan', candidateEmail: 'sara.hassan@email.com', jobTitle: 'Senior Software Engineer', departmentName: 'Engineering', currentStage: ApplicationStage.DEPARTMENT_INTERVIEW },
  { id: '3', applicationId: 'APP-2024-003', candidateName: 'Omar Khaled', candidateEmail: 'omar.khaled@email.com', jobTitle: 'Product Manager', departmentName: 'Product', currentStage: ApplicationStage.HR_INTERVIEW },
  { id: '6', applicationId: 'APP-2024-006', candidateName: 'Nour Adel', candidateEmail: 'nour.adel@email.com', jobTitle: 'HR Coordinator', departmentName: 'Human Resources', currentStage: ApplicationStage.DEPARTMENT_INTERVIEW },
];

const mockScheduledInterviews: ScheduledInterview[] = [
  {
    id: 'int-1',
    applicationId: '2',
    candidateName: 'Sara Hassan',
    jobTitle: 'Senior Software Engineer',
    scheduledDate: '2024-12-17',
    startTime: '10:00',
    endTime: '11:00',
    method: InterviewMethod.VIDEO,
    panelMembers: ['Ahmed Hassan', 'Sara Ali'],
    status: InterviewStatus.SCHEDULED,
    videoLink: 'https://meet.google.com/abc-defg-hij',
  },
  {
    id: 'int-2',
    applicationId: '3',
    candidateName: 'Omar Khaled',
    jobTitle: 'Product Manager',
    scheduledDate: '2024-12-16',
    startTime: '14:00',
    endTime: '15:00',
    method: InterviewMethod.ONSITE,
    panelMembers: ['Omar Youssef', 'Fatima Khalid'],
    status: InterviewStatus.COMPLETED,
    location: 'Meeting Room A, 3rd Floor',
  },
];

// =====================================================
// Components
// =====================================================

function InterviewMethodBadge({ method }: { method: InterviewMethod }) {
  const config = {
    [InterviewMethod.ONSITE]: { label: 'Onsite', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    [InterviewMethod.VIDEO]: { label: 'Video Call', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    [InterviewMethod.PHONE]: { label: 'Phone', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  
  const { label, color } = config[method];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const config = {
    [InterviewStatus.SCHEDULED]: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    [InterviewStatus.COMPLETED]: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    [InterviewStatus.CANCELLED]: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },
  };
  
  const { label, color } = config[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

// Confirmation Modal
function ConfirmationModal({
  interview,
  application,
  panelMembers,
  timeSlot,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  interview: NewInterview;
  application: ApplicationForInterview | undefined;
  panelMembers: PanelMember[];
  timeSlot: TimeSlot | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const selectedPanelNames = panelMembers
    .filter((m) => interview.selectedPanel.includes(m.id))
    .map((m) => m.name);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Confirm Interview</h2>
          <p className="text-slate-600 mt-1">Please review the interview details before scheduling.</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500">Candidate</label>
              <p className="font-medium text-slate-900">{application?.candidateName || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Position</label>
              <p className="font-medium text-slate-900">{application?.jobTitle || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Date & Time</label>
              <p className="font-medium text-slate-900">
                {timeSlot
                  ? `${new Date(timeSlot.date).toLocaleDateString()} ${timeSlot.startTime} - ${timeSlot.endTime}`
                  : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Method</label>
              <p className="font-medium text-slate-900">
                <InterviewMethodBadge method={interview.method} />
              </p>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-slate-500">Panel Members</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedPanelNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
          
          {interview.method === InterviewMethod.VIDEO && interview.videoLink && (
            <div>
              <label className="text-sm text-slate-500">Video Link</label>
              <p className="font-medium text-indigo-600 break-all">{interview.videoLink}</p>
            </div>
          )}
          
          {interview.method === InterviewMethod.ONSITE && interview.location && (
            <div>
              <label className="text-sm text-slate-500">Location</label>
              <p className="font-medium text-slate-900">{interview.location}</p>
            </div>
          )}
          
          {interview.notes && (
            <div>
              <label className="text-sm text-slate-500">Notes</label>
              <p className="text-slate-700">{interview.notes}</p>
            </div>
          )}
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Note:</strong> Calendar invites will be sent automatically to the candidate and panel members.
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isSubmitting}>
            Schedule Interview
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function InterviewSchedulingPage() {
  const searchParams = useSearchParams();
  const preselectedAppId = searchParams.get('applicationId');

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationForInterview[]>([]);
  const [panelMembers, setPanelMembers] = useState<PanelMember[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newInterview, setNewInterview] = useState<NewInterview>({
    applicationId: preselectedAppId || '',
    stage: ApplicationStage.DEPARTMENT_INTERVIEW,
    selectedPanel: [],
    selectedSlot: '',
    method: InterviewMethod.VIDEO,
    videoLink: '',
    location: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setApplications(mockApplicationsForInterview);
      setPanelMembers(mockPanelMembers);
      setTimeSlots(mockTimeSlots);
      setScheduledInterviews(mockScheduledInterviews);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-open form if applicationId is provided
  useEffect(() => {
    if (preselectedAppId && !loading) {
      setShowScheduleForm(true);
      setNewInterview((prev) => ({ ...prev, applicationId: preselectedAppId }));
    }
  }, [preselectedAppId, loading]);

  // Toggle panel member selection (BR-19, BR-20)
  const togglePanelMember = (memberId: string) => {
    setNewInterview((prev) => ({
      ...prev,
      selectedPanel: prev.selectedPanel.includes(memberId)
        ? prev.selectedPanel.filter((id) => id !== memberId)
        : [...prev.selectedPanel, memberId],
    }));
  };

  // Validate form (BR-19)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newInterview.applicationId) {
      newErrors.applicationId = 'Please select a candidate';
    }

    if (newInterview.selectedPanel.length === 0) {
      newErrors.panel = 'Please select at least one panel member';
    }

    if (!newInterview.selectedSlot) {
      newErrors.slot = 'Please select a time slot';
    }

    if (newInterview.method === InterviewMethod.VIDEO && !newInterview.videoLink) {
      newErrors.videoLink = 'Please provide a video meeting link';
    }

    if (newInterview.method === InterviewMethod.ONSITE && !newInterview.location) {
      newErrors.location = 'Please provide the interview location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle schedule click
  const handleScheduleClick = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  // Confirm and submit (BR-19)
  const handleConfirmSchedule = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const selectedApp = applications.find((a) => a.id === newInterview.applicationId);
    const selectedSlot = timeSlots.find((s) => s.id === newInterview.selectedSlot);
    const selectedPanelNames = panelMembers
      .filter((m) => newInterview.selectedPanel.includes(m.id))
      .map((m) => m.name);

    if (selectedApp && selectedSlot) {
      const newScheduledInterview: ScheduledInterview = {
        id: `int-${Date.now()}`,
        applicationId: newInterview.applicationId,
        candidateName: selectedApp.candidateName,
        jobTitle: selectedApp.jobTitle,
        scheduledDate: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        method: newInterview.method,
        panelMembers: selectedPanelNames,
        status: InterviewStatus.SCHEDULED,
        videoLink: newInterview.method === InterviewMethod.VIDEO ? newInterview.videoLink : undefined,
        location: newInterview.method === InterviewMethod.ONSITE ? newInterview.location : undefined,
      };

      setScheduledInterviews((prev) => [newScheduledInterview, ...prev]);
      
      // Mark slot as unavailable
      setTimeSlots((prev) =>
        prev.map((slot) =>
          slot.id === newInterview.selectedSlot ? { ...slot, available: false } : slot
        )
      );
    }

    setIsSubmitting(false);
    setShowConfirmation(false);
    setShowScheduleForm(false);
    setNewInterview({
      applicationId: '',
      stage: ApplicationStage.DEPARTMENT_INTERVIEW,
      selectedPanel: [],
      selectedSlot: '',
      method: InterviewMethod.VIDEO,
      videoLink: '',
      location: '',
      notes: '',
    });

    setSuccessMessage('Interview scheduled successfully! Calendar invites have been sent.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const selectedApplication = applications.find((a) => a.id === newInterview.applicationId);
  const selectedTimeSlot = timeSlots.find((s) => s.id === newInterview.selectedSlot);

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
          <h1 className="text-2xl font-bold text-slate-900">Interview Scheduling</h1>
          <p className="text-slate-600 mt-1">
            Schedule and manage candidate interviews
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowScheduleForm(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Interview
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
          <p className="text-sm text-slate-600">Pending Scheduling</p>
          <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">
            {scheduledInterviews.filter((i) => i.status === InterviewStatus.SCHEDULED).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">
            {scheduledInterviews.filter((i) => i.status === InterviewStatus.COMPLETED).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Available Slots</p>
          <p className="text-2xl font-bold text-indigo-600">
            {timeSlots.filter((s) => s.available).length}
          </p>
        </div>
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <Card className="mb-6" title="Schedule New Interview">
          <div className="space-y-6">
            {/* Select Candidate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Candidate <span className="text-red-500">*</span>
              </label>
              <select
                value={newInterview.applicationId}
                onChange={(e) => setNewInterview({ ...newInterview, applicationId: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                  errors.applicationId ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'
                }`}
              >
                <option value="">Choose a candidate...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.candidateName} - {app.jobTitle}
                  </option>
                ))}
              </select>
              {errors.applicationId && (
                <p className="text-red-600 text-sm mt-1">{errors.applicationId}</p>
              )}
            </div>

            {/* Interview Stage */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interview Stage
              </label>
              <select
                value={newInterview.stage}
                onChange={(e) => setNewInterview({ ...newInterview, stage: e.target.value as ApplicationStage })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={ApplicationStage.DEPARTMENT_INTERVIEW}>Department Interview</option>
                <option value={ApplicationStage.HR_INTERVIEW}>HR Interview</option>
              </select>
            </div>

            {/* Panel Members Selection (BR-19, BR-20) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Panel Members <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Select interviewers. Panel members should have relevant expertise (BR-20).
              </p>
              <div className="grid grid-cols-2 gap-3">
                {panelMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => member.available && togglePanelMember(member.id)}
                    disabled={!member.available}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      newInterview.selectedPanel.includes(member.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : member.available
                        ? 'border-slate-200 hover:border-indigo-300'
                        : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <p className="text-sm text-slate-500">{member.role}</p>
                        <p className="text-xs text-slate-400">{member.department}</p>
                      </div>
                      {newInterview.selectedPanel.includes(member.id) && (
                        <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {!member.available && (
                        <span className="text-xs text-red-500">Unavailable</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {errors.panel && <p className="text-red-600 text-sm mt-1">{errors.panel}</p>}
            </div>

            {/* Time Slot Selection (BR-19) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Available Time Slots <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => slot.available && setNewInterview({ ...newInterview, selectedSlot: slot.id })}
                    disabled={!slot.available}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      newInterview.selectedSlot === slot.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : slot.available
                        ? 'border-slate-200 hover:border-indigo-300'
                        : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <p className="font-medium text-slate-900">
                      {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {slot.startTime} - {slot.endTime}
                    </p>
                    {!slot.available && (
                      <span className="text-xs text-red-500">Booked</span>
                    )}
                  </button>
                ))}
              </div>
              {errors.slot && <p className="text-red-600 text-sm mt-1">{errors.slot}</p>}
            </div>

            {/* Interview Mode (BR-19) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interview Mode <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {[
                  { value: InterviewMethod.VIDEO, label: 'Video Call', icon: '📹' },
                  { value: InterviewMethod.ONSITE, label: 'Onsite', icon: '🏢' },
                  { value: InterviewMethod.PHONE, label: 'Phone', icon: '📞' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setNewInterview({ ...newInterview, method: option.value })}
                    className={`flex-1 p-4 rounded-lg border text-center transition-colors ${
                      newInterview.method === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{option.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Link (if video) */}
            {newInterview.method === InterviewMethod.VIDEO && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Video Meeting Link <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newInterview.videoLink}
                  onChange={(e) => setNewInterview({ ...newInterview, videoLink: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  error={errors.videoLink}
                />
              </div>
            )}

            {/* Location (if onsite) */}
            {newInterview.method === InterviewMethod.ONSITE && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interview Location <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newInterview.location}
                  onChange={(e) => setNewInterview({ ...newInterview, location: e.target.value })}
                  placeholder="Meeting Room A, 3rd Floor"
                  error={errors.location}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={newInterview.notes}
                onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any special instructions or notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowScheduleForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleScheduleClick}>
                Review & Schedule
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Scheduled Interviews */}
      <Card title="Scheduled Interviews" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Method
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Panel
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scheduledInterviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No interviews scheduled yet.
                  </td>
                </tr>
              ) : (
                scheduledInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{interview.candidateName}</p>
                      <p className="text-sm text-slate-500">{interview.jobTitle}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">
                        {new Date(interview.scheduledDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-500">
                        {interview.startTime} - {interview.endTime}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <InterviewMethodBadge method={interview.method} />
                      {interview.videoLink && (
                        <a
                          href={interview.videoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                        >
                          Join Meeting →
                        </a>
                      )}
                      {interview.location && (
                        <p className="text-xs text-slate-500 mt-1">{interview.location}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {interview.panelMembers.map((name, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <InterviewStatusBadge status={interview.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {interview.status === InterviewStatus.COMPLETED && (
                          <Link href={`/dashboard/hr-employee/recruitment/interviews/${interview.id}`}>
                            <Button variant="primary" size="sm">
                              Add Feedback
                            </Button>
                          </Link>
                        )}
                        {interview.status === InterviewStatus.SCHEDULED && (
                          <>
                            <Button variant="outline" size="sm">
                              Reschedule
                            </Button>
                            <Button variant="danger" size="sm">
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          interview={newInterview}
          application={selectedApplication}
          panelMembers={panelMembers}
          timeSlot={selectedTimeSlot}
          onConfirm={handleConfirmSchedule}
          onCancel={() => setShowConfirmation(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
