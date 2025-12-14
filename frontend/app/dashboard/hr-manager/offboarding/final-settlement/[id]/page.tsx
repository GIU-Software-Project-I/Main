'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  ClearanceCompletionStatus,
} from '@/app/services/offboarding';

export default function FinalSettlementPage() {
  const params = useParams();
  const terminationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<TerminationRequest | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceCompletionStatus | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (terminationId) {
      fetchData();
    }
  }, [terminationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const requestData = await offboardingService.getTerminationRequestById(terminationId);
      setRequest(requestData);

      if (requestData.status === TerminationStatus.APPROVED) {
        try {
          const checklist = await offboardingService.getClearanceChecklistByTerminationId(terminationId);
          const status = await offboardingService.getClearanceCompletionStatus(checklist._id);
          setClearanceStatus(status);
        } catch {
          // Clearance might not exist
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSettlement = async () => {
    try {
      setTriggering(true);
      setError(null);
      await offboardingService.triggerFinalSettlement({ terminationId });
      setTriggered(true);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger final settlement');
    } finally {
      setTriggering(false);
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

  if (!request) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          Termination request not found
        </div>
        <Link href="/dashboard/hr-manager/offboarding" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Offboarding Dashboard
        </Link>
      </div>
    );
  }

  const canTriggerSettlement = request.status === TerminationStatus.APPROVED && clearanceStatus?.fullyCleared;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-gray-500 hover:text-gray-700">
              Offboarding
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Final Settlement</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Final Settlement</h1>
          <p className="text-gray-600 mt-1">Phase 7: Benefits termination and final pay calculation (OFF-013)</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {triggered && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          Final settlement has been triggered successfully. The payroll team will process the final payment.
        </div>
      )}

      {/* Termination Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Termination Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
            <dd className="mt-1 text-gray-900">{request.employeeId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                request.status === TerminationStatus.APPROVED
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {request.status.replace('_', ' ').toUpperCase()}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Termination Date</dt>
            <dd className="mt-1 text-gray-900">
              {request.terminationDate ? new Date(request.terminationDate).toLocaleDateString() : 'Not specified'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Reason</dt>
            <dd className="mt-1 text-gray-900">{request.reason}</dd>
          </div>
        </dl>
      </div>

      {/* Clearance Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Clearance Status</h2>
        {clearanceStatus ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.allDepartmentsCleared ? 'text-green-600' : 'text-yellow-600'}`}>
                  {clearanceStatus.allDepartmentsCleared ? 'Cleared' : 'Pending'}
                </p>
                <p className="text-sm text-gray-500">Departments</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.allEquipmentReturned ? 'text-green-600' : 'text-yellow-600'}`}>
                  {clearanceStatus.allEquipmentReturned ? 'Returned' : 'Pending'}
                </p>
                <p className="text-sm text-gray-500">Equipment</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.cardReturned ? 'text-green-600' : 'text-yellow-600'}`}>
                  {clearanceStatus.cardReturned ? 'Returned' : 'Pending'}
                </p>
                <p className="text-sm text-gray-500">Access Card</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.fullyCleared ? 'text-green-600' : 'text-red-600'}`}>
                  {clearanceStatus.fullyCleared ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-gray-500">Fully Cleared</p>
              </div>
            </div>

            {!clearanceStatus.fullyCleared && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Employee must be fully cleared before final settlement can be processed.
                </p>
                {clearanceStatus.pendingDepartments.length > 0 && (
                  <p className="text-sm text-yellow-800 mt-1">
                    Pending departments: {clearanceStatus.pendingDepartments.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800">Clearance checklist has not been created yet.</p>
            <Link
              href={`/dashboard/hr-manager/offboarding/resignations/${terminationId}`}
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Go to request details to create clearance checklist
            </Link>
          </div>
        )}
      </div>

      {/* Settlement Components */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Settlement Components</h2>
        <p className="text-sm text-gray-600 mb-4">
          Per BR 11: Leaves balance must be reviewed and settled (unused annuals to be encashed).
          Benefits plans are set to be auto-terminated as of the end of the notice period.
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Unused Annual Leave Encashment</span>
            <span className="text-gray-500 text-sm">Calculated from Leaves Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Final Salary (Pro-rated)</span>
            <span className="text-gray-500 text-sm">Calculated from Payroll Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Pending Allowances</span>
            <span className="text-gray-500 text-sm">Calculated from Payroll Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Deductions (Loans, Advances)</span>
            <span className="text-gray-500 text-sm">Calculated from Payroll Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Benefits Termination</span>
            <span className="text-gray-500 text-sm">Auto-terminated at end of notice period</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Trigger Final Settlement</h2>
        {canTriggerSettlement ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              All clearance requirements have been met. Click the button below to trigger the final settlement process.
              This will notify the payroll team to calculate and process the final payment.
            </p>
            <button
              onClick={handleTriggerSettlement}
              disabled={triggering || triggered}
              className={`px-6 py-3 rounded-md text-white font-medium ${
                triggered
                  ? 'bg-green-500 cursor-not-allowed'
                  : triggering
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {triggered ? 'Settlement Triggered' : triggering ? 'Processing...' : 'Trigger Final Settlement'}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              Final settlement cannot be triggered until:
            </p>
            <ul className="list-disc list-inside text-gray-600 mt-2">
              {request.status !== TerminationStatus.APPROVED && (
                <li>Termination request is approved</li>
              )}
              {!clearanceStatus?.fullyCleared && (
                <li>Employee is fully cleared (all departments, equipment, and access card)</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

