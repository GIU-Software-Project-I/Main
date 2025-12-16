'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { leavesService } from '@/app/services/leaves';

type TabType = 'categories' | 'types' | 'policies' | 'eligibility' | 'calendar' | 'accruals' | 'reset';

interface LeaveCategory {
  _id: string;
  name: string;
  description?: string;
}

interface LeaveType {
  _id: string;
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  paid: boolean;
  deductible: boolean;
  requiresAttachment: boolean;
  attachmentType?: 'medical' | 'document' | 'other';
  minTenureMonths?: number;
  maxDurationDays?: number;
}

interface LeavePolicy {
  _id: string;
  leaveTypeId: string;
  accrualMethod: 'monthly' | 'yearly' | 'per-term';
  monthlyRate?: number;
  yearlyRate?: number;
  carryForwardAllowed: boolean;
  maxCarryForward?: number;
  expiryAfterMonths?: number;
  roundingRule: 'none' | 'round' | 'round_up' | 'round_down';
  minNoticeDays: number;
  maxConsecutiveDays?: number;
}

export default function HRAdminLeavesConfigPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // Types state
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    description: '',
    paid: true,
    deductible: true,
    requiresAttachment: false,
    attachmentType: 'medical' as 'medical' | 'document' | 'other',
    minTenureMonths: undefined as number | undefined,
    maxDurationDays: undefined as number | undefined,
  });
  const [editingType, setEditingType] = useState<string | null>(null);

  // Policies state
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [policyForm, setPolicyForm] = useState({
    leaveTypeId: '',
    accrualMethod: 'monthly' as 'monthly' | 'yearly' | 'per-term',
    monthlyRate: undefined as number | undefined,
    yearlyRate: undefined as number | undefined,
    carryForwardAllowed: false,
    maxCarryForward: undefined as number | undefined,
    expiryAfterMonths: undefined as number | undefined,
    roundingRule: 'round' as 'none' | 'round' | 'round_up' | 'round_down',
    minNoticeDays: 0,
    maxConsecutiveDays: undefined as number | undefined,
  });
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  // Eligibility state
  const [selectedTypeForEligibility, setSelectedTypeForEligibility] = useState<string>('');
  const [eligibilityForm, setEligibilityForm] = useState({
    minTenureMonths: undefined as number | undefined,
    positionsAllowed: [] as string[],
    contractTypesAllowed: [] as string[],
    employmentTypes: [] as string[],
  });

  // Calendar state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState<{ holidays: string[]; blockedPeriods: Array<{ from: string; to: string; reason: string }> } | null>(null);
  const [holidayForm, setHolidayForm] = useState({ date: '', reason: '' });
  const [blockedPeriodForm, setBlockedPeriodForm] = useState({ from: '', to: '', reason: '' });

  // Accruals state
  const [accrualForm, setAccrualForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    method: 'monthly' as 'monthly' | 'yearly' | 'per-term',
    roundingRule: 'round' as 'none' | 'round' | 'round_up' | 'round_down',
  });
  const [carryForwardForm, setCarryForwardForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    capDays: undefined as number | undefined,
    expiryMonths: undefined as number | undefined,
  });

  // Reset state
  const [resetForm, setResetForm] = useState({
    strategy: 'calendarYear' as 'hireDate' | 'calendarYear' | 'custom',
    referenceDate: new Date().toISOString().split('T')[0],
  });

  const fetchCategories = useCallback(async () => {
    try {
      const response = await leavesService.getAllCategories();
      if (Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchTypes = useCallback(async () => {
    try {
      const response = await leavesService.getLeaveTypes();
      if (Array.isArray(response.data)) {
        setTypes(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch types:', err);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const response = await leavesService.getPolicies();
      if (Array.isArray(response.data)) {
        setPolicies(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    }
  }, []);

  const fetchCalendar = useCallback(async (year: number) => {
    try {
      const response = await leavesService.getCalendar(year);
      if (response.data) {
        const data = response.data as {
          holidays?: Date[] | string[];
          blockedPeriods?: Array<{ from: Date | string; to: Date | string; reason?: string }>;
        };
        setCalendar({
          holidays: data.holidays?.map((d) => {
            const date = typeof d === 'string' ? new Date(d) : d;
            return date.toISOString().split('T')[0];
          }) || [],
          blockedPeriods: data.blockedPeriods?.map((bp) => ({
            from: typeof bp.from === 'string' ? bp.from : bp.from.toISOString().split('T')[0],
            to: typeof bp.to === 'string' ? bp.to : bp.to.toISOString().split('T')[0],
            reason: bp.reason || '',
          })) || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
      setCalendar({ holidays: [], blockedPeriods: [] });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCategories();
    fetchTypes();
    if (activeTab === 'policies') {
      fetchPolicies();
    }
    if (activeTab === 'calendar') {
      fetchCalendar(selectedYear);
    }
  }, [user, activeTab, selectedYear, fetchCategories, fetchTypes, fetchPolicies, fetchCalendar]);

  // Category handlers
  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await leavesService.createCategory(categoryForm);
      setSuccess('Category created successfully');
      setCategoryForm({ name: '', description: '' });
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await leavesService.updateCategory(id, categoryForm);
      setSuccess('Category updated successfully');
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      setLoading(true);
      setError(null);
      await leavesService.deleteCategory(id);
      setSuccess('Category deleted successfully');
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Type handlers
  const handleCreateType = async () => {
    if (!typeForm.code.trim() || !typeForm.name.trim() || !typeForm.categoryId) {
      setError('Code, name, and category are required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await leavesService.createLeaveType(typeForm);
      setSuccess('Leave type created successfully');
      setTypeForm({
        code: '',
        name: '',
        categoryId: '',
        description: '',
        paid: true,
        deductible: true,
        requiresAttachment: false,
        attachmentType: 'medical',
        minTenureMonths: undefined,
        maxDurationDays: undefined,
      });
      await fetchTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create leave type');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateType = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await leavesService.updateLeaveType(id, typeForm);
      setSuccess('Leave type updated successfully');
      setEditingType(null);
      setTypeForm({
        code: '',
        name: '',
        categoryId: '',
        description: '',
        paid: true,
        deductible: true,
        requiresAttachment: false,
        attachmentType: 'medical',
        minTenureMonths: undefined,
        maxDurationDays: undefined,
      });
      await fetchTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update leave type');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return;
    try {
      setLoading(true);
      setError(null);
      await leavesService.deleteLeaveType(id);
      setSuccess('Leave type deleted successfully');
      await fetchTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete leave type');
    } finally {
      setLoading(false);
    }
  };

  // Policy handlers
  const handleCreatePolicy = async () => {
    if (!policyForm.leaveTypeId) {
      setError('Leave type is required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await leavesService.createPolicy(policyForm);
      setSuccess('Policy created successfully');
      setPolicyForm({
        leaveTypeId: '',
        accrualMethod: 'monthly',
        monthlyRate: undefined,
        yearlyRate: undefined,
        carryForwardAllowed: false,
        maxCarryForward: undefined,
        expiryAfterMonths: undefined,
        roundingRule: 'round',
        minNoticeDays: 0,
        maxConsecutiveDays: undefined,
      });
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicy = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await leavesService.updatePolicy(id, policyForm);
      setSuccess('Policy updated successfully');
      setEditingPolicy(null);
      setPolicyForm({
        leaveTypeId: '',
        accrualMethod: 'monthly',
        monthlyRate: undefined,
        yearlyRate: undefined,
        carryForwardAllowed: false,
        maxCarryForward: undefined,
        expiryAfterMonths: undefined,
        roundingRule: 'round',
        minNoticeDays: 0,
        maxConsecutiveDays: undefined,
      });
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      setLoading(true);
      setError(null);
      await leavesService.deletePolicy(id);
      setSuccess('Policy deleted successfully');
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy');
    } finally {
      setLoading(false);
    }
  };

  // Eligibility handler
  const handleSaveEligibility = async () => {
    if (!selectedTypeForEligibility) {
      setError('Please select a leave type');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await leavesService.setEligibility(selectedTypeForEligibility, eligibilityForm);
      setSuccess('Eligibility rules saved successfully');
      setEligibilityForm({
        minTenureMonths: undefined,
        positionsAllowed: [],
        contractTypesAllowed: [],
        employmentTypes: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save eligibility rules');
    } finally {
      setLoading(false);
    }
  };

  // Calendar handlers
  const handleAddHoliday = async () => {
    if (!holidayForm.date) {
      setError('Date is required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await leavesService.addHoliday({
        year: selectedYear,
        date: holidayForm.date,
        reason: holidayForm.reason,
      });
      setSuccess('Holiday added successfully');
      setHolidayForm({ date: '', reason: '' });
      await fetchCalendar(selectedYear);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedPeriod = async () => {
    if (!blockedPeriodForm.from || !blockedPeriodForm.to || !blockedPeriodForm.reason) {
      setError('From date, to date, and reason are required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await leavesService.addBlockedPeriod({
        year: selectedYear,
        from: blockedPeriodForm.from,
        to: blockedPeriodForm.to,
        reason: blockedPeriodForm.reason,
      });
      setSuccess('Blocked period added successfully');
      setBlockedPeriodForm({ from: '', to: '', reason: '' });
      await fetchCalendar(selectedYear);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add blocked period');
    } finally {
      setLoading(false);
    }
  };

  // Accrual handlers
  const handleRunAccrual = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leavesService.runAccrual(accrualForm);
      const result = response.data as { processed?: number } | undefined;
      setSuccess(`Accrual completed. Processed: ${result?.processed || 0} entitlements`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run accrual');
    } finally {
      setLoading(false);
    }
  };

  const handleCarryForward = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leavesService.carryForward(carryForwardForm);
      const result = response.data as { processed?: number } | undefined;
      setSuccess(`Carry forward completed. Processed: ${result?.processed || 0} entitlements`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run carry forward');
    } finally {
      setLoading(false);
    }
  };

  // Reset handler
  const handleResetLeaveYear = async () => {
    if (!confirm('This will reset leave balances. Are you sure?')) return;
    try {
      setLoading(true);
      setError(null);
      await leavesService.resetLeaveYear(resetForm);
      setSuccess('Leave year reset completed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset leave year');
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'categories', label: 'Leave Categories' },
    { id: 'types', label: 'Leave Types' },
    { id: 'policies', label: 'Leave Policies' },
    { id: 'eligibility', label: 'Eligibility Rules' },
    { id: 'calendar', label: 'Calendar & Holidays' },
    { id: 'accruals', label: 'Accruals & Carry Forward' },
    { id: 'reset', label: 'Leave Year Reset' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Leave Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Configure leave policies, types, and settings</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError(null);
                setSuccess(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Paid Leave, Unpaid Leave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingCategory ? () => handleUpdateCategory(editingCategory) : handleCreateCategory}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                  </button>
                  {editingCategory && (
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: '', description: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Categories</h2>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{cat.name}</p>
                      {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat._id);
                          setCategoryForm({ name: cat.name, description: cat.description || '' });
                        }}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No categories found. Create one above.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Types Tab */}
        {activeTab === 'types' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingType ? 'Edit Leave Type' : 'Create New Leave Type'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ANNUAL, SICK"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Annual Leave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={typeForm.categoryId}
                    onChange={(e) => setTypeForm({ ...typeForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={typeForm.description}
                    onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Tenure (Months)</label>
                  <input
                    type="number"
                    value={typeForm.minTenureMonths || ''}
                    onChange={(e) => setTypeForm({ ...typeForm, minTenureMonths: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Duration (Days)</label>
                  <input
                    type="number"
                    value={typeForm.maxDurationDays || ''}
                    onChange={(e) => setTypeForm({ ...typeForm, maxDurationDays: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="paid"
                    checked={typeForm.paid}
                    onChange={(e) => setTypeForm({ ...typeForm, paid: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="paid" className="text-sm text-gray-700">Paid Leave</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deductible"
                    checked={typeForm.deductible}
                    onChange={(e) => setTypeForm({ ...typeForm, deductible: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="deductible" className="text-sm text-gray-700">Deductible from Balance</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresAttachment"
                    checked={typeForm.requiresAttachment}
                    onChange={(e) => setTypeForm({ ...typeForm, requiresAttachment: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="requiresAttachment" className="text-sm text-gray-700">Requires Attachment</label>
                </div>
                {typeForm.requiresAttachment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachment Type</label>
                    <select
                      value={typeForm.attachmentType}
                      onChange={(e) => setTypeForm({ ...typeForm, attachmentType: e.target.value as 'medical' | 'document' | 'other' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="medical">Medical</option>
                      <option value="document">Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={editingType ? () => handleUpdateType(editingType) : handleCreateType}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingType ? 'Update' : 'Create'}
                </button>
                {editingType && (
                  <button
                    onClick={() => {
                      setEditingType(null);
                      setTypeForm({
                        code: '',
                        name: '',
                        categoryId: '',
                        description: '',
                        paid: true,
                        deductible: true,
                        requiresAttachment: false,
                        attachmentType: 'medical',
                        minTenureMonths: undefined,
                        maxDurationDays: undefined,
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Leave Types</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {types.map((type) => {
                      const category = categories.find((c) => c._id === type.categoryId);
                      return (
                        <tr key={type._id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{type.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {type.name}
                            {category && <span className="text-gray-500 ml-2">({category.name})</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{type.paid ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingType(type._id);
                                  setTypeForm({
                                    code: type.code,
                                    name: type.name,
                                    categoryId: type.categoryId,
                                    description: type.description || '',
                                    paid: type.paid,
                                    deductible: type.deductible,
                                    requiresAttachment: type.requiresAttachment,
                                    attachmentType: type.attachmentType || 'medical',
                                    minTenureMonths: type.minTenureMonths,
                                    maxDurationDays: type.maxDurationDays,
                                  });
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteType(type._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {types.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No leave types found. Create one above.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                  <select
                    value={policyForm.leaveTypeId}
                    onChange={(e) => setPolicyForm({ ...policyForm, leaveTypeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select leave type</option>
                    {types.map((type) => (
                      <option key={type._id} value={type._id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Method *</label>
                  <select
                    value={policyForm.accrualMethod}
                    onChange={(e) => setPolicyForm({ ...policyForm, accrualMethod: e.target.value as 'monthly' | 'yearly' | 'per-term' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="per-term">Per Term</option>
                  </select>
                </div>
                {policyForm.accrualMethod === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate</label>
                    <input
                      type="number"
                      step="0.1"
                      value={policyForm.monthlyRate || ''}
                      onChange={(e) => setPolicyForm({ ...policyForm, monthlyRate: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1.67"
                    />
                  </div>
                )}
                {policyForm.accrualMethod === 'yearly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Rate</label>
                    <input
                      type="number"
                      step="0.1"
                      value={policyForm.yearlyRate || ''}
                      onChange={(e) => setPolicyForm({ ...policyForm, yearlyRate: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 20"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rounding Rule</label>
                  <select
                    value={policyForm.roundingRule}
                    onChange={(e) => setPolicyForm({ ...policyForm, roundingRule: e.target.value as 'none' | 'round' | 'round_up' | 'round_down' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="round">Round</option>
                    <option value="round_up">Round Up</option>
                    <option value="round_down">Round Down</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Notice Days</label>
                  <input
                    type="number"
                    value={policyForm.minNoticeDays}
                    onChange={(e) => setPolicyForm({ ...policyForm, minNoticeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Days</label>
                  <input
                    type="number"
                    value={policyForm.maxConsecutiveDays || ''}
                    onChange={(e) => setPolicyForm({ ...policyForm, maxConsecutiveDays: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="carryForward"
                    checked={policyForm.carryForwardAllowed}
                    onChange={(e) => setPolicyForm({ ...policyForm, carryForwardAllowed: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="carryForward" className="text-sm text-gray-700">Allow Carry Forward</label>
                </div>
                {policyForm.carryForwardAllowed && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Carry Forward (Days)</label>
                      <input
                        type="number"
                        value={policyForm.maxCarryForward || ''}
                        onChange={(e) => setPolicyForm({ ...policyForm, maxCarryForward: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry After (Months)</label>
                      <input
                        type="number"
                        value={policyForm.expiryAfterMonths || ''}
                        onChange={(e) => setPolicyForm({ ...policyForm, expiryAfterMonths: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 12"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={editingPolicy ? () => handleUpdatePolicy(editingPolicy) : handleCreatePolicy}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingPolicy ? 'Update' : 'Create'}
                </button>
                {editingPolicy && (
                  <button
                    onClick={() => {
                      setEditingPolicy(null);
                      setPolicyForm({
                        leaveTypeId: '',
                        accrualMethod: 'monthly',
                        monthlyRate: undefined,
                        yearlyRate: undefined,
                        carryForwardAllowed: false,
                        maxCarryForward: undefined,
                        expiryAfterMonths: undefined,
                        roundingRule: 'round',
                        minNoticeDays: 0,
                        maxConsecutiveDays: undefined,
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Policies</h2>
              <div className="space-y-2">
                {policies.map((policy) => {
                  const type = types.find((t) => t._id === policy.leaveTypeId);
                  return (
                    <div key={policy._id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{type?.name || 'Unknown Type'}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Accrual: {policy.accrualMethod} | Notice: {policy.minNoticeDays} days | 
                            Carry Forward: {policy.carryForwardAllowed ? `Yes (max ${policy.maxCarryForward || 0} days)` : 'No'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingPolicy(policy._id);
                              setPolicyForm({
                                leaveTypeId: policy.leaveTypeId,
                                accrualMethod: policy.accrualMethod,
                                monthlyRate: policy.monthlyRate,
                                yearlyRate: policy.yearlyRate,
                                carryForwardAllowed: policy.carryForwardAllowed,
                                maxCarryForward: policy.maxCarryForward,
                                expiryAfterMonths: policy.expiryAfterMonths,
                                roundingRule: policy.roundingRule,
                                minNoticeDays: policy.minNoticeDays,
                                maxConsecutiveDays: policy.maxConsecutiveDays,
                              });
                            }}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(policy._id)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {policies.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No policies found. Create one above.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Eligibility Tab */}
        {activeTab === 'eligibility' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Set Eligibility Rules</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                  <select
                    value={selectedTypeForEligibility}
                    onChange={(e) => setSelectedTypeForEligibility(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select leave type</option>
                    {types.map((type) => (
                      <option key={type._id} value={type._id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Tenure (Months)</label>
                  <input
                    type="number"
                    value={eligibilityForm.minTenureMonths || ''}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, minTenureMonths: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Positions Allowed (comma-separated)</label>
                  <input
                    type="text"
                    value={eligibilityForm.positionsAllowed.join(', ')}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, positionsAllowed: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Manager, Director"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Types Allowed (comma-separated)</label>
                  <input
                    type="text"
                    value={eligibilityForm.contractTypesAllowed.join(', ')}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, contractTypesAllowed: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Full-time, Part-time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Types Allowed (comma-separated)</label>
                  <input
                    type="text"
                    value={eligibilityForm.employmentTypes.join(', ')}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, employmentTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Permanent, Contract"
                  />
                </div>
                <button
                  onClick={handleSaveEligibility}
                  disabled={loading || !selectedTypeForEligibility}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Eligibility Rules'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => {
                    const year = Number(e.target.value);
                    setSelectedYear(year);
                    fetchCalendar(year);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Holiday</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={holidayForm.reason}
                    onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., New Year"
                  />
                </div>
              </div>
              <button
                onClick={handleAddHoliday}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Holiday'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Blocked Period</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    value={blockedPeriodForm.from}
                    onChange={(e) => setBlockedPeriodForm({ ...blockedPeriodForm, from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    value={blockedPeriodForm.to}
                    onChange={(e) => setBlockedPeriodForm({ ...blockedPeriodForm, to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <input
                    type="text"
                    value={blockedPeriodForm.reason}
                    onChange={(e) => setBlockedPeriodForm({ ...blockedPeriodForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Company Closure"
                  />
                </div>
              </div>
              <button
                onClick={handleAddBlockedPeriod}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Blocked Period'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Holidays & Blocked Periods for {selectedYear}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Holidays</h3>
                  {calendar && calendar.holidays.length > 0 ? (
                    <div className="space-y-1">
                      {calendar.holidays.map((date, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                          {new Date(date).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No holidays added for this year.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Blocked Periods</h3>
                  {calendar && calendar.blockedPeriods.length > 0 ? (
                    <div className="space-y-1">
                      {calendar.blockedPeriods.map((bp, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                          {new Date(bp.from).toLocaleDateString()} - {new Date(bp.to).toLocaleDateString()}: {bp.reason}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No blocked periods added for this year.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accruals Tab */}
        {activeTab === 'accruals' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Accrual</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Date</label>
                  <input
                    type="date"
                    value={accrualForm.referenceDate}
                    onChange={(e) => setAccrualForm({ ...accrualForm, referenceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Method</label>
                  <select
                    value={accrualForm.method}
                    onChange={(e) => setAccrualForm({ ...accrualForm, method: e.target.value as 'monthly' | 'yearly' | 'per-term' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="per-term">Per Term</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rounding Rule</label>
                  <select
                    value={accrualForm.roundingRule}
                    onChange={(e) => setAccrualForm({ ...accrualForm, roundingRule: e.target.value as 'none' | 'round' | 'round_up' | 'round_down' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="round">Round</option>
                    <option value="round_up">Round Up</option>
                    <option value="round_down">Round Down</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleRunAccrual}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run Accrual'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Carry Forward</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Date</label>
                  <input
                    type="date"
                    value={carryForwardForm.referenceDate}
                    onChange={(e) => setCarryForwardForm({ ...carryForwardForm, referenceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cap Days (optional)</label>
                  <input
                    type="number"
                    value={carryForwardForm.capDays || ''}
                    onChange={(e) => setCarryForwardForm({ ...carryForwardForm, capDays: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry After (Months, optional)</label>
                  <input
                    type="number"
                    value={carryForwardForm.expiryMonths || ''}
                    onChange={(e) => setCarryForwardForm({ ...carryForwardForm, expiryMonths: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12"
                  />
                </div>
              </div>
              <button
                onClick={handleCarryForward}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run Carry Forward'}
              </button>
            </div>
          </div>
        )}

        {/* Reset Tab */}
        {activeTab === 'reset' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reset Leave Year</h2>
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> This action will reset leave balances according to the selected strategy. This cannot be undone.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reset Strategy *</label>
                  <select
                    value={resetForm.strategy}
                    onChange={(e) => setResetForm({ ...resetForm, strategy: e.target.value as 'hireDate' | 'calendarYear' | 'custom' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hireDate">By Hire Date</option>
                    <option value="calendarYear">Calendar Year (Jan 1)</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>
                {resetForm.strategy === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Date *</label>
                    <input
                      type="date"
                      value={resetForm.referenceDate}
                      onChange={(e) => setResetForm({ ...resetForm, referenceDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <button
                  onClick={handleResetLeaveYear}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Leave Year'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

