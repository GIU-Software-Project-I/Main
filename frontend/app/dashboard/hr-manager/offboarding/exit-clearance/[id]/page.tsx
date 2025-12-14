'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  offboardingService,
  ClearanceChecklist,
  ClearanceCompletionStatus,
  ApprovalStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/app/context/AuthContext';


export default function ExitClearancePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const checklistId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ClearanceChecklist | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ClearanceCompletionStatus | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (checklistId) {
      fetchData();
    }
  }, [checklistId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [checklistData, statusData] = await Promise.all([
        offboardingService.getClearanceChecklistById(checklistId),
        offboardingService.getClearanceCompletionStatus(checklistId),
      ]);
      setChecklist(checklistData);
      setCompletionStatus(statusData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clearance data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartment = async (department: string, status: ApprovalStatus, comments?: string) => {
    if (!user) return;

    try {
      setUpdating(department);
      setError(null);
      await offboardingService.updateClearanceItem(checklistId, {
        department,
        status,
        comments,
        updatedBy: user.id || 'unknown',
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update clearance item');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateEquipment = async (equipmentName: string, returned: boolean) => {
    try {
      setUpdating(equipmentName);
      setError(null);
      await offboardingService.updateEquipmentItem(checklistId, equipmentName, {
        name: equipmentName,
        returned,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update equipment status');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateCardReturn = async (returned: boolean) => {
    try {
      setUpdating('card');
      setError(null);
      await offboardingService.updateCardReturn(checklistId, returned);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update card return status');
    } finally {
      setUpdating(null);
    }
  };

  const handleTriggerFinalSettlement = async () => {
    if (!checklist) return;

    try {
      setError(null);
      await offboardingService.triggerFinalSettlement({
        terminationId: checklist.terminationId,
      });
      router.push(`/dashboard/hr-manager/offboarding/final-settlement/${checklist.terminationId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger final settlement');
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'bg-green-100 text-green-800 border-green-200';
      case ApprovalStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      case ApprovalStatus.PENDING:
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          Clearance checklist not found
        </div>
        <Link href="/dashboard/hr-manager/offboarding" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Offboarding Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-gray-500 hover:text-gray-700">
              Offboarding
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Exit Clearance</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Exit Clearance Checklist</h1>
          <p className="text-gray-600 mt-1">Phase 5: Multi-department sign-off process (OFF-006, OFF-010)</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Completion Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Clearance Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.allDepartmentsCleared ? 'text-green-600' : 'text-yellow-600'}`}>
              {completionStatus?.allDepartmentsCleared ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-gray-500 mt-1">All Departments Cleared</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.allEquipmentReturned ? 'text-green-600' : 'text-yellow-600'}`}>
              {completionStatus?.allEquipmentReturned ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-gray-500 mt-1">All Equipment Returned</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.cardReturned ? 'text-green-600' : 'text-yellow-600'}`}>
              {completionStatus?.cardReturned ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Access Card Returned</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.fullyCleared ? 'text-green-600' : 'text-red-600'}`}>
              {completionStatus?.fullyCleared ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Fully Cleared</p>
          </div>
        </div>

        {completionStatus?.pendingDepartments && completionStatus.pendingDepartments.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Pending Departments:</strong> {completionStatus.pendingDepartments.join(', ')}
            </p>
          </div>
        )}

        {completionStatus?.fullyCleared && (
          <div className="mt-4">
            <button
              onClick={handleTriggerFinalSettlement}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Proceed to Final Settlement
            </button>
          </div>
        )}
      </div>

      {/* Department Sign-offs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Department Sign-offs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {checklist.items.map((item) => (
            <div key={item.department} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{item.department}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(item.status)}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  {item.comments && (
                    <p className="text-sm text-gray-500 mt-1">Comments: {item.comments}</p>
                  )}
                  {item.updatedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Updated: {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const comments = prompt('Enter approval comments (optional):');
                      handleUpdateDepartment(item.department, ApprovalStatus.APPROVED, comments || undefined);
                    }}
                    disabled={updating === item.department || item.status === ApprovalStatus.APPROVED}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      item.status === ApprovalStatus.APPROVED
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    {updating === item.department ? 'Updating...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter rejection reason:');
                      if (comments) handleUpdateDepartment(item.department, ApprovalStatus.REJECTED, comments);
                    }}
                    disabled={updating === item.department || item.status === ApprovalStatus.REJECTED}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      item.status === ApprovalStatus.REJECTED
                        ? 'bg-red-100 text-red-800 cursor-not-allowed'
                        : 'border border-red-300 text-red-700 hover:bg-red-50'
                    } disabled:opacity-50`}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Return */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Equipment Return</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {checklist.equipmentList.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No equipment to return</div>
          ) : (
            checklist.equipmentList.map((equipment) => (
              <div key={equipment.name} className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{equipment.name}</h3>
                  {equipment.condition && (
                    <p className="text-sm text-gray-500">Condition: {equipment.condition}</p>
                  )}
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={equipment.returned}
                    onChange={(e) => handleUpdateEquipment(equipment.name, e.target.checked)}
                    disabled={updating === equipment.name}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className={equipment.returned ? 'text-green-600' : 'text-gray-500'}>
                    {equipment.returned ? 'Returned' : 'Not Returned'}
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Access Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Access Card</h2>
            <p className="text-sm text-gray-500 mt-1">Has the employee returned their access card?</p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={checklist.cardReturned}
              onChange={(e) => handleUpdateCardReturn(e.target.checked)}
              disabled={updating === 'card'}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className={checklist.cardReturned ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {checklist.cardReturned ? 'Returned' : 'Not Returned'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

