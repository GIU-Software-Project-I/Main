'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
// Type definitions
interface TaxRule {
  _id: string;
  name: string;
  description?: string;
  rate: number; // tax rate in percentage
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  __v: number;
}

// Predefined tax types
const taxTypeOptions = [
  { value: 'Income Tax', label: 'Income Tax' },
  { value: 'Corporate Tax', label: 'Corporate Tax' },
  { value: 'Value Added Tax (VAT)', label: 'Value Added Tax (VAT)' },
  { value: 'Withholding Tax', label: 'Withholding Tax' },
  { value: 'Capital Gains Tax', label: 'Capital Gains Tax' },
  { value: 'Property Tax', label: 'Property Tax' },
  { value: 'Excise Tax', label: 'Excise Tax' },
  { value: 'Customs Duty', label: 'Customs Duty' },
];

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels = {
  draft: 'Draft',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function TaxRulesPage() {
  const { user } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTaxRule, setSelectedTaxRule] = useState<TaxRule | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
 
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    customName: '',
    useCustomName: false,
    description: '',
    rate: '',
  });

  // Fetch tax rules on component mount
  useEffect(() => {
    fetchTaxRules();
  }, []);

  const fetchTaxRules = async () => {
    try {
      setLoading(true);
      setError(null);
     
      const response = await payrollConfigurationService.getTaxRules();
     
      if (response.error) {
        throw new Error(response.error);
      }
     
      if (!response.data) {
        console.warn('No data in response');
        setTaxRules([]);
        return;
      }
     
      const apiData = response.data as any;
     
      if (apiData.data && Array.isArray(apiData.data)) {
        setTaxRules(apiData.data);
      }
      else if (Array.isArray(apiData)) {
        setTaxRules(apiData);
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setTaxRules([]);
      }
     
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tax rules');
      console.error('Error fetching tax rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Required fields - check either dropdown selection or custom name
    const effectiveName = formData.useCustomName ? formData.customName.trim() : formData.name;
    if (!effectiveName) errors.push('Tax rule name is required');
    if (!formData.rate) errors.push('Tax rate is required');

    // Numeric validation
    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate < 0) errors.push('Tax rate must be a positive number');
    if (rate > 100) errors.push('Tax rate cannot exceed 100%');

    return errors;
  };

  const handleCreateTaxRule = async () => {
    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      // Get the employee ID - REQUIRED by backend DTO
      const createdByEmployeeId = user?.id || '';
      
      if (!createdByEmployeeId) {
        setError('Unable to identify user. Please make sure you are logged in.');
        return;
      }

      setActionLoading(true);
      
      // Use custom name if enabled, otherwise use selected option
      const effectiveName = formData.useCustomName ? formData.customName.trim() : formData.name;
     
      const apiData = {
        name: effectiveName,
        description: formData.description || undefined,
        rate: parseFloat(formData.rate),
        createdByEmployeeId: createdByEmployeeId,
      };
     
      console.log('Creating tax rule with data:', apiData);
     
      const response = await payrollConfigurationService.createTaxRule(apiData);
     
      if (response.error) {
        throw new Error(response.error);
      }
     
      // Check for backend validation errors
      if (response.data) {
        const responseData = response.data as any;
       
        if (responseData.message && responseData.message.includes('already exists')) {
          throw new Error(responseData.message);
        }
        else if (responseData.error) {
          throw new Error(responseData.error);
        }
        else if (responseData.statusCode && responseData.statusCode >= 400) {
          const errorMessage = responseData.message ||
                              responseData.error?.message ||
                              'Failed to create tax rule';
          throw new Error(errorMessage);
        }
      }
     
      setSuccess('Tax rule created successfully as DRAFT');
      setShowModal(false);
      resetForm();
      fetchTaxRules();
    } catch (err: any) {
      console.error('Create error details:', err);
     
      let errorMessage = 'Failed to create tax rule';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
     
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTaxRule = async () => {
    if (!selectedTaxRule) return;
   
    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      // Check if tax rule can be edited (only draft status)
      if (selectedTaxRule.status !== 'draft') {
        setError('Only DRAFT tax rules can be edited. Approved or rejected rules cannot be modified.');
        return;
      }

      setActionLoading(true);
     
      const updateData = {
        description: formData.description || undefined,
        rate: parseFloat(formData.rate),
      };
     
      const response = await payrollConfigurationService.updateTaxRule(
        selectedTaxRule._id,
        updateData
      );
     
      if (response.error) {
        throw new Error(response.error);
      }
     
      if (response.data) {
        const responseData = response.data as any;
       
        if (responseData.statusCode && responseData.statusCode >= 400) {
          throw new Error(responseData.message || 'Failed to update tax rule');
        }
      }
     
      setSuccess('Tax rule updated successfully');
      setShowModal(false);
      resetForm();
      fetchTaxRules();
    } catch (err: any) {
      console.error('Update error details:', err);
     
      let errorMessage = 'Failed to update tax rule';
      if (err.message) {
        errorMessage = err.message;
      }
     
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTaxRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rule? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await payrollConfigurationService.deleteTaxRule(id);
     
      if (response.error) {
        throw new Error(response.error);
      }
     
      setSuccess('Tax rule deleted successfully');
      fetchTaxRules();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tax rule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (taxRule: TaxRule) => {
    // Check if tax rule can be edited (only draft status)
    if (taxRule.status !== 'draft') {
      setError('Only DRAFT tax rules can be edited. Approved or rejected rules cannot be modified.');
      return;
    }
    
    // Check if the name is a predefined option
    const isPredefined = taxTypeOptions.some(opt => opt.value === taxRule.name);
   
    setSelectedTaxRule(taxRule);
    setFormData({
      name: isPredefined ? taxRule.name : '',
      customName: isPredefined ? '' : taxRule.name,
      useCustomName: !isPredefined,
      description: taxRule.description || '',
      rate: taxRule.rate.toString(),
    });
   
    setShowModal(true);
  };

  const handleViewClick = (taxRule: TaxRule) => {
    setSelectedTaxRule(taxRule);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      customName: '',
      useCustomName: false,
      description: '',
      rate: '',
    });
    setSelectedTaxRule(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatPercentage = (rate: number) => {
    if (rate === undefined || rate === null) return '—';
    return `${rate.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tax Rules Configuration</h1>
            <p className="text-slate-600 mt-2">Loading tax rules...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Rules Configuration</h1>
          <p className="text-slate-600 mt-2">
            Define tax rules and laws (e.g., progressive tax rates, exemptions, thresholds) to ensure payroll compliance with current legislation
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTaxRules}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Tax Rule
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="text-green-600">✓</div>
          <p className="text-green-800 font-medium">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <div className="text-red-600">✕</div>
          <div>
            <p className="text-red-800 font-medium">Validation Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Tax Rules Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Tax Rules ({taxRules.length})</h2>
        </div>
       
        {taxRules.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 mb-4">💰</div>
            <p className="text-slate-600 font-medium">No tax rules found</p>
            <p className="text-slate-500 text-sm mt-1">Create your first tax rule to get started</p>
            <button
              onClick={handleCreateClick}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Tax Rule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Tax Rule</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Description</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Rate</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Created</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {taxRules.map((taxRule) => (
                  <tr key={taxRule._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-slate-900">{taxRule.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs">
                        <p className="text-slate-700 text-sm truncate" title={taxRule.description || 'No description'}>
                          {taxRule.description || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-700 font-medium">
                        {formatPercentage(taxRule.rate)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[taxRule.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[taxRule.status] || taxRule.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-700 text-sm">{formatDate(taxRule.createdAt)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {/* View button */}
                        <button
                          onClick={() => handleViewClick(taxRule)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          👁️
                        </button>
                       
                        {/* Edit button - Only show for DRAFT rules */}
                        {taxRule.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEditClick(taxRule)}
                              className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                           
                       
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Legal & Policy Admin Information - Tax Rules</h3>
        <ul className="text-blue-800 text-sm space-y-2">
          <li>• As a Legal & Policy Admin, you can <span className="font-semibold">create draft</span> tax rules</li>
          <li>• You can <span className="font-semibold">edit draft</span> tax rules only (not approved or rejected ones)</li>
   
          <li>• You can <span className="font-semibold">view all</span> tax rules (draft, approved, rejected)</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> rules cannot be modified</li>
          <li>• Tax rules define tax rates, exemptions, and thresholds for payroll calculations</li>
          <li>• <span className="font-semibold">Compliance:</span> Configurations must follow current tax legislation</li>
          <li>• <span className="font-semibold">Note:</span> Payroll Manager has approval authority for tax rule configurations</li>
          <li>• <span className="font-semibold">Business Rule BR 5:</span> System must identify payroll income taxes' brackets enforced through Local Tax Law</li>
          <li>• <span className="font-semibold">Business Rule BR 6:</span> System must support multiple tax components (e.g. income tax, exemptions)</li>
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedTaxRule ? 'Edit Tax Rule' : 'Create Tax Rule'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tax Rule Name *
                </label>
                
                {/* Toggle for custom name */}
                {!selectedTaxRule && (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="useCustomName"
                      checked={formData.useCustomName}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        useCustomName: e.target.checked,
                        name: e.target.checked ? '' : prev.name,
                        customName: e.target.checked ? prev.customName : ''
                      }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="useCustomName" className="text-sm text-slate-600">
                      Use custom name instead of predefined types
                    </label>
                  </div>
                )}
                
                {formData.useCustomName ? (
                  <input
                    type="text"
                    name="customName"
                    value={formData.customName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Enter custom tax rule name..."
                    maxLength={100}
                    disabled={!!selectedTaxRule}
                  />
                ) : (
                  <select
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!selectedTaxRule}
                  >
                    <option value="">Select tax type</option>
                    {taxTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {formData.useCustomName 
                    ? 'Enter a custom name for your tax rule' 
                    : 'Select from predefined tax types or enable custom name'}
                </p>
                {selectedTaxRule && (
                  <p className="text-xs text-amber-600 mt-1">Tax rule name cannot be changed after creation</p>
                )}
              </div>
             
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tax Rate (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., 15"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-slate-500">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Tax rate percentage to be applied</p>
              </div>
             
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter description, exemptions, thresholds, or legal references..."
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {formData.description.length}/500 characters
                </p>
              </div>
             
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">ℹ️ Important Notes</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Tax rate must be between 0% and 100%</li>
                  <li>• Once created, tax rule name cannot be changed</li>
                  <li>• All rules start in DRAFT status and require Payroll Manager approval</li>
                  <li>• Ensure tax rules comply with current local tax legislation</li>
                  <li>• Consider progressive tax brackets, exemptions, and thresholds</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={selectedTaxRule ? handleUpdateTaxRule : handleCreateTaxRule}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : selectedTaxRule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTaxRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Tax Rule Details</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedTaxRule.name}</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusColors[selectedTaxRule.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[selectedTaxRule.status] || selectedTaxRule.status}
                  </span>
                </div>
                <div className="text-slate-600 text-sm">ID: {selectedTaxRule._id.substring(0, 8)}...</div>
              </div>
             
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Tax Rate</p>
                  <p className="font-medium text-slate-900 text-3xl">{formatPercentage(selectedTaxRule.rate)}</p>
                </div>
               
                {selectedTaxRule.description && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Description</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedTaxRule.description}</p>
                    </div>
                  </div>
                )}
               
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="font-medium text-slate-900">{statusLabels[selectedTaxRule.status]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Created</p>
                    <p className="font-medium text-slate-900">{formatDate(selectedTaxRule.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Last Modified</p>
                    <p className="font-medium text-slate-900">{formatDate(selectedTaxRule.updatedAt)}</p>
                  </div>
                  {selectedTaxRule.createdBy && (
                    <div>
                      <p className="text-sm text-slate-500">Created By</p>
                      <p className="font-medium text-slate-900">{selectedTaxRule.createdBy}</p>
                    </div>
                  )}
                </div>
               
                {selectedTaxRule.approvedBy && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-600">Approved By</p>
                        <p className="font-medium text-green-800">{selectedTaxRule.approvedBy}</p>
                      </div>
                      {selectedTaxRule.approvedAt && (
                        <div>
                          <p className="text-sm text-green-600">Approved At</p>
                          <p className="font-medium text-green-800">{formatDate(selectedTaxRule.approvedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}