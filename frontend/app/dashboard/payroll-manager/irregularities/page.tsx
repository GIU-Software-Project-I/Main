'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { payrollExecutionService } from '@/app/services/payroll-execution';

interface Irregularity {
  _id: string;
  employeeCode: string;
  employeeName: string;
  type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'escalated' | 'resolved' | 'rejected';
  description: string;
  currentValue?: number;
  previousValue?: number;
  previousAverage?: number;
  variancePercentage?: number;
  flaggedAt: string;
  escalatedAt?: string;
  escalationReason?: string;
  resolution?: {
    action: string;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
  };
  payrollRun?: {
    entity: string;
    period: string;
    status: string;
    runId: string;
  };
}

export default function IrregularitiesPage() {
  const [irregularities, setIrregularities] = useState<Irregularity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'escalated' | 'resolved'>('all');
  const [selectedIrregularity, setSelectedIrregularity] = useState<Irregularity | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    action: 'approved',
    notes: '',
    adjustedValue: '',
  });
  const [stats, setStats] = useState({ pending: 0, escalated: 0, resolved: 0 });

  useEffect(() => {
    fetchIrregularities();
  }, [filter]);

  interface IrregularityDataResponse {
    data: Irregularity[];
    pending?: number;
    escalated?: number;
    resolved?: number;
    [key: string]: any;
  }

  const fetchIrregularities = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await payrollExecutionService.listIrregularities(params);
      const isIrregularityArray = (data: any): data is Irregularity[] =>
        Array.isArray(data) && data.every(
          (item) => typeof item === 'object' && item !== null && '_id' in item
        );

      let irregularityData: IrregularityDataResponse;
      if (
        res?.data &&
        typeof res.data === 'object' &&
        'data' in res.data &&
        isIrregularityArray(res.data.data)
      ) {
        irregularityData = res.data as IrregularityDataResponse;
      } else {
        irregularityData = { data: [], pending: 0, escalated: 0, resolved: 0 };
      }
      setIrregularities(Array.isArray(irregularityData.data) ? irregularityData.data : []);
      setStats({
        pending: irregularityData.pending || 0,
        escalated: irregularityData.escalated || 0,
        resolved: irregularityData.resolved || 0,
      });
    } catch (err) {
      console.error('Failed to fetch irregularities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedIrregularity || !resolutionForm.notes.trim()) {
      alert('Please provide resolution notes');
      return;
    }

    setResolving(true);
    try {
      const payload: any = {
        action: resolutionForm.action,
        notes: resolutionForm.notes,
      };
      
      if (resolutionForm.action === 'adjusted' && resolutionForm.adjustedValue) {
        payload.adjustedValue = parseFloat(resolutionForm.adjustedValue);
      }

      await payrollExecutionService.resolveIrregularity(selectedIrregularity._id, payload);
      alert('Irregularity resolved successfully');
      setSelectedIrregularity(null);
      setResolutionForm({ action: 'approved', notes: '', adjustedValue: '' });
      fetchIrregularities();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to resolve irregularity');
    } finally {
      setResolving(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      info: 'bg-blue-100 text-blue-800',
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[severity] || styles.info}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      escalated: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      overtime_spike: '⏰',
      salary_spike: '📈',
      negative_net_pay: '🔴',
      commission_spike: '💰',
      new_hire_prorated: 'ℹ️',
      loan_deduction: '🏦',
      penalty_deduction: '⚠️',
      absence_deduction: '📅',
      suspended_employee: '🚫',
      extended_unpaid_leave: '🏖️',
    };
    return icons[type] || '⚡';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => `EGP ${amount?.toLocaleString() || 0}`;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/payroll-manager" className="hover:text-blue-600">Dashboard</Link>
          <span>→</span>
          <span className="text-gray-900">Irregularities</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Irregularities Management</h1>
        <p className="text-gray-600 mt-1">Review and resolve flagged payroll issues</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => setFilter('all')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer border-2 transition-colors ${
            filter === 'all' ? 'border-blue-500' : 'border-transparent hover:border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.pending + stats.escalated + stats.resolved}</div>
        </div>
        <div 
          onClick={() => setFilter('pending')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer border-2 transition-colors ${
            filter === 'pending' ? 'border-yellow-500' : 'border-transparent hover:border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div 
          onClick={() => setFilter('escalated')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer border-2 transition-colors ${
            filter === 'escalated' ? 'border-purple-500' : 'border-transparent hover:border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-500">Escalated</div>
          <div className="text-2xl font-bold text-purple-600">{stats.escalated}</div>
        </div>
        <div 
          onClick={() => setFilter('resolved')}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer border-2 transition-colors ${
            filter === 'resolved' ? 'border-green-500' : 'border-transparent hover:border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-500">Resolved</div>
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
        </div>
      </div>

      {/* Irregularities Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">
            {filter === 'all' ? 'All Irregularities' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Irregularities`}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : irregularities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No irregularities found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Employee</th>
                  <th className="text-left p-3">Department</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Severity</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Flagged</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {irregularities.map((irr) => (
                  <tr key={irr._id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getTypeIcon(irr.type)}</span>
                        <span className="text-gray-900 font-medium">
                          {irr.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{irr.employeeName}</div>
                      <div className="text-xs text-gray-500">{irr.employeeCode}</div>
                    </td>
                    <td className="p-3 text-gray-700">
                      {irr.payrollRun?.entity || 'N/A'}
                    </td>
                    <td className="p-3">
                      <div className="text-gray-700 max-w-xs truncate" title={irr.description}>
                        {irr.description}
                      </div>
                      {irr.currentValue !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          Value: {formatCurrency(irr.currentValue)}
                          {irr.variancePercentage && ` (+${irr.variancePercentage}%)`}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{getSeverityBadge(irr.severity)}</td>
                    <td className="p-3">{getStatusBadge(irr.status)}</td>
                    <td className="p-3 text-gray-500 text-xs">{formatDate(irr.flaggedAt)}</td>
                    <td className="p-3">
                      {irr.status !== 'resolved' ? (
                        <button
                          onClick={() => setSelectedIrregularity(irr)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedIrregularity(irr)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 transition-colors"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedIrregularity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedIrregularity.status === 'resolved' ? 'View Resolution' : 'Resolve Irregularity'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedIrregularity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedIrregularity(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Irregularity Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Issue Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Employee:</span>
                    <div className="font-medium text-gray-900">{selectedIrregularity.employeeName}</div>
                    <div className="text-xs text-gray-500">{selectedIrregularity.employeeCode}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Department:</span>
                    <div className="font-medium text-gray-900">{selectedIrregularity.payrollRun?.entity || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Severity:</span>
                    <div className="mt-1">{getSeverityBadge(selectedIrregularity.severity)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className="mt-1">{getStatusBadge(selectedIrregularity.status)}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-gray-500 text-sm">Description:</span>
                  <p className="text-gray-900 mt-1">{selectedIrregularity.description}</p>
                </div>
                {selectedIrregularity.currentValue !== undefined && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <div className="text-sm text-gray-500">Current Value</div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(selectedIrregularity.currentValue)}
                    </div>
                    {selectedIrregularity.previousAverage !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        Previous Average: {formatCurrency(selectedIrregularity.previousAverage)}
                        {selectedIrregularity.variancePercentage && 
                          <span className="text-red-600 ml-2">(+{selectedIrregularity.variancePercentage}%)</span>
                        }
                      </div>
                    )}
                  </div>
                )}
                {selectedIrregularity.escalationReason && (
                  <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
                    <div className="text-sm text-purple-700 font-medium">Escalation Reason</div>
                    <p className="text-purple-900 mt-1">{selectedIrregularity.escalationReason}</p>
                    {selectedIrregularity.escalatedAt && (
                      <div className="text-xs text-purple-600 mt-2">
                        Escalated: {formatDate(selectedIrregularity.escalatedAt)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resolution Form or View */}
              {selectedIrregularity.status === 'resolved' && selectedIrregularity.resolution ? (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">Resolution</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-green-700">Action:</span>
                      <span className="ml-2 font-medium text-green-900 capitalize">
                        {selectedIrregularity.resolution.action}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Notes:</span>
                      <p className="text-green-900 mt-1">{selectedIrregularity.resolution.notes}</p>
                    </div>
                    <div className="text-xs text-green-600 mt-2">
                      Resolved: {formatDate(selectedIrregularity.resolution.resolvedAt)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Resolution Action</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['approved', 'rejected', 'adjusted', 'excluded'].map((action) => (
                        <button
                          key={action}
                          onClick={() => setResolutionForm({ ...resolutionForm, action })}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${
                            resolutionForm.action === action
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900 capitalize">{action}</div>
                          <div className="text-xs text-gray-500">
                            {action === 'approved' && 'Accept the flagged value'}
                            {action === 'rejected' && 'Reject and flag for correction'}
                            {action === 'adjusted' && 'Modify the value'}
                            {action === 'excluded' && 'Exclude from payroll'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {resolutionForm.action === 'adjusted' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adjusted Value (EGP)
                      </label>
                      <input
                        type="number"
                        value={resolutionForm.adjustedValue}
                        onChange={(e) => setResolutionForm({ ...resolutionForm, adjustedValue: e.target.value })}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="Enter adjusted value"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resolution Notes <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={resolutionForm.notes}
                      onChange={(e) => setResolutionForm({ ...resolutionForm, notes: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      rows={3}
                      placeholder="Explain your decision..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedIrregularity(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                {selectedIrregularity.status === 'resolved' ? 'Close' : 'Cancel'}
              </button>
              {selectedIrregularity.status !== 'resolved' && (
                <button
                  onClick={handleResolve}
                  disabled={resolving || !resolutionForm.notes.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolving ? 'Resolving...' : 'Submit Resolution'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}