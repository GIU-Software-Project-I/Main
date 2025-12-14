'use client';

import { useState, useEffect } from 'react';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';

const EQUIPMENT_TYPES = [
  { id: 'laptop', name: 'Laptop', icon: '💻' },
  { id: 'monitor', name: 'Monitor', icon: '🖥️' },
  { id: 'keyboard', name: 'Keyboard', icon: '⌨️' },
  { id: 'mouse', name: 'Mouse', icon: '🖱️' },
  { id: 'headset', name: 'Headset', icon: '🎧' },
  { id: 'phone', name: 'Desk Phone', icon: '📞' },
  { id: 'access_card', name: 'Access Card', icon: '🪪' },
  { id: 'desk', name: 'Desk/Workspace', icon: '🪑' },
];

export default function EquipmentReservationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, string[]>>({});
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setOnboardings([]);
    } finally {
      setLoading(false);
    }
  };

  const getAdminTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.filter(t =>
      t.department === 'Admin' || t.department === 'Facilities' || t.name.toLowerCase().includes('equipment')
    ) || [];
  };

  const hasAdminPendingTasks = (onboarding: Onboarding) => {
    return getAdminTasks(onboarding).some(t => t.status !== OnboardingTaskStatus.COMPLETED);
  };

  const filteredOnboardings = onboardings.filter(o => {
    if (filterStatus === 'pending') return !o.completed && hasAdminPendingTasks(o);
    if (filterStatus === 'completed') return o.completed || !hasAdminPendingTasks(o);
    return true;
  });

  const handleEquipmentToggle = (onboardingId: string, equipmentId: string) => {
    setSelectedEquipment(prev => {
      const current = prev[onboardingId] || [];
      if (current.includes(equipmentId)) {
        return { ...prev, [onboardingId]: current.filter(e => e !== equipmentId) };
      }
      return { ...prev, [onboardingId]: [...current, equipmentId] };
    });
  };

  const handleReserveEquipment = async (onboarding: Onboarding) => {
    const employeeId = typeof onboarding.employeeId === 'object'
      ? (onboarding.employeeId as any)?._id
      : onboarding.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    const equipment = selectedEquipment[onboarding._id] || [];
    if (equipment.length === 0) {
      setError('Please select at least one equipment item');
      return;
    }

    try {
      setProcessing(onboarding._id);
      setError(null);
      setSuccess(null);

      await onboardingService.reserveEquipment({
        employeeId,
        equipment: equipment, // string[] of equipment type IDs
      });

      // Mark Admin tasks as completed
      const adminTasks = getAdminTasks(onboarding);
      for (const task of adminTasks) {
        if (task.status !== OnboardingTaskStatus.COMPLETED) {
          await onboardingService.updateTaskStatus(onboarding._id, task.name, {
            status: OnboardingTaskStatus.COMPLETED,
            completedAt: new Date().toISOString(),
          });
        }
      }

      setSuccess(`Equipment reserved successfully for employee ${employeeId}`);
      setSelectedEquipment(prev => ({ ...prev, [onboarding._id]: [] }));
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reserve equipment');
    } finally {
      setProcessing(null);
    }
  };

  const stats = {
    total: onboardings.length,
    pendingAdmin: onboardings.filter(o => !o.completed && hasAdminPendingTasks(o)).length,
    completedAdmin: onboardings.filter(o => o.completed || !hasAdminPendingTasks(o)).length,
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Equipment & Resource Reservation</h1>
        <p className="text-gray-600 mt-1">Reserve equipment, desk and access cards for new hires (ONB-012)</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Business Rules */}
      <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
        <h3 className="font-medium text-purple-900">Business Rules</h3>
        <ul className="mt-2 text-sm text-purple-800 space-y-1">
          <li><strong>BR 9(c):</strong> Auto onboarding tasks are generated for Admin (allocation and assignment of workspace, ID badge)</li>
          <li><strong>ONB-012:</strong> Reserve and track equipment, desk and access cards for new hires, so resources are ready on Day 1</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Onboardings</p>
          <p className="text-2xl font-semibold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Pending Equipment</p>
          <p className="text-2xl font-semibold mt-1 text-purple-600">{stats.pendingAdmin}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Equipment Assigned</p>
          <p className="text-2xl font-semibold mt-1 text-green-600">{stats.completedAdmin}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            filterStatus === 'pending' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending ({stats.pendingAdmin})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed ({stats.completedAdmin})
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({stats.total})
        </button>
      </div>

      {/* Onboarding List */}
      <div className="space-y-4">
        {filteredOnboardings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>No onboardings found matching the filter.</p>
          </div>
        ) : (
          filteredOnboardings.map((onboarding) => {
            const employeeIdDisplay = typeof onboarding.employeeId === 'object'
              ? (onboarding.employeeId as any)?._id || (onboarding.employeeId as any)?.firstName || 'Unknown'
              : onboarding.employeeId;
            const adminTasks = getAdminTasks(onboarding);
            const hasPending = hasAdminPendingTasks(onboarding);
            const selected = selectedEquipment[onboarding._id] || [];

            return (
              <div key={onboarding._id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">Employee: {employeeIdDisplay}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        hasPending ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {hasPending ? 'Pending Equipment' : 'Equipment Assigned'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Started: {new Date(onboarding.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Admin Tasks */}
                {adminTasks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Admin Tasks:</p>
                    <div className="flex flex-wrap gap-2">
                      {adminTasks.map((task, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 text-xs rounded-full ${
                            task.status === OnboardingTaskStatus.COMPLETED 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {task.name}: {task.status}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment Selection */}
                {hasPending && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Select Equipment to Reserve:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {EQUIPMENT_TYPES.map((eq) => (
                        <button
                          key={eq.id}
                          onClick={() => handleEquipmentToggle(onboarding._id, eq.id)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            selected.includes(eq.id)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-lg">{eq.icon}</span>
                          <p className="text-sm font-medium mt-1">{eq.name}</p>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleReserveEquipment(onboarding)}
                        disabled={processing === onboarding._id || selected.length === 0}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      >
                        {processing === onboarding._id ? 'Reserving...' : `Reserve ${selected.length} Item(s)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
