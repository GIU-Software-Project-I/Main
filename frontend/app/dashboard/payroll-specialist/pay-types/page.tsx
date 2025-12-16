'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';

// Type definitions based on your API response
interface PayType {
  _id: string;
  type: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  __v: number;
}

// Predefined pay types based on requirements
const payTypeOptions = [
  { value: 'Hourly Wage', label: 'Hourly Wage' },
  { value: 'Daily Rate', label: 'Daily Rate' },
  { value: 'Weekly Salary', label: 'Weekly Salary' },
  { value: 'Monthly Salary', label: 'Monthly Salary' },
  { value: 'Contract-Based', label: 'Contract-Based' },
  { value: 'Commission', label: 'Commission' },
  { value: 'Bonus', label: 'Bonus' },
];

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function PayTypesPage() {
  const { user } = useAuth();
  const [payTypes, setPayTypes] = useState<PayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayType, setSelectedPayType] = useState<PayType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Search and filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });
  
  // Form state - ONLY the fields your backend expects
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
  });

  // Fetch pay types on component mount
  useEffect(() => {
    fetchPayTypes();
  }, []);

  const fetchPayTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await payrollConfigurationService.getPayTypes();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setPayTypes([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        setPayTypes(apiData.data);
      } 
      else if (Array.isArray(apiData)) {
        setPayTypes(apiData);
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setPayTypes([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pay types');
      console.error('Error fetching pay types:', err);
    } finally {
      setLoading(false);
    }
  };

const handleCreatePayType = async () => {
  try {
    // Basic frontend validation - just check for empty fields
    if (!formData.type || !formData.amount) {
      setError('Please fill all required fields');
      return;
    }

    // Convert amount to number - backend will validate the minimum value
    const amountNum = parseFloat(formData.amount);
    
    if (isNaN(amountNum)) {
      setError('Amount must be a valid number');
      return;
    }

    setActionLoading(true);
    
    // Get the employee ID - REQUIRED by backend DTO
    let createdByEmployeeId = user?.id || '';
    
    if (!createdByEmployeeId) {
      setError('Unable to identify user. Please make sure you are logged in.');
      setActionLoading(false);
      return;
    }
    
    // Validate that createdByEmployeeId looks like a MongoDB ObjectId
    // MongoDB ObjectIds are 24-character hex strings
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(createdByEmployeeId)) {
      console.warn('Employee ID does not look like a MongoDB ObjectId:', createdByEmployeeId);
      // Continue anyway - the backend validation will catch it
    }
    
    // Prepare the data exactly as the DTO expects
    const apiData = {
      type: formData.type,
      amount: amountNum,
      createdByEmployeeId: createdByEmployeeId,
    };
    
    console.log('Creating pay type with data:', apiData);
    
    const response = await payrollConfigurationService.createPayType(apiData);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Check for backend validation errors
    if (response.data) {
      const responseData = response.data as any;
      
      // Handle various error response formats
      if (responseData.message && responseData.message.includes('already exists')) {
        throw new Error(responseData.message);
      }
      else if (responseData.error) {
        throw new Error(responseData.error);
      }
      else if (responseData.statusCode && responseData.statusCode >= 400) {
        // Extract validation messages if available
        const errorMessage = responseData.message || 
                            responseData.error?.message || 
                            'Failed to create pay type';
        throw new Error(errorMessage);
      }
    }
    
    setSuccess('Pay type created successfully as DRAFT');
    setShowModal(false);
    resetForm();
    fetchPayTypes();
  } catch (err: any) {
    console.error('Create error details:', err);
    
    // Extract error message from various possible formats
    let errorMessage = 'Failed to create pay type';
    
    if (err.message) {
      errorMessage = err.message;
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    }
    
    // Format backend validation errors nicely
    if (errorMessage.includes('minimum')) {
      errorMessage = errorMessage.replace('amount must not be less than 6000', 'Amount must be at least $6,000 (backed by industry minimum wage standards)');
    }
    
    // Special handling for ObjectId conversion errors
    if (errorMessage.includes('ObjectId') || errorMessage.includes('Cast to ObjectId')) {
      errorMessage = 'User identification issue. Please try logging out and back in.';
    }
    
    setError(errorMessage);
  } finally {
    setActionLoading(false);
  }
};
  const handleUpdatePayType = async () => {
    if (!selectedPayType) return;
    
    try {
      // Basic frontend validation
      if (!formData.type || !formData.amount) {
        setError('Please fill all required fields');
        return;
      }

      // Convert amount to number - backend will validate
      const amountNum = parseFloat(formData.amount);
      
      if (isNaN(amountNum)) {
        setError('Amount must be a valid number');
        return;
      }

      setActionLoading(true);
      
      const updateData = {
        type: formData.type,
        amount: amountNum,
      };
      
      const response = await payrollConfigurationService.updatePayType(
        selectedPayType._id,
        updateData
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Check for backend validation errors
      if (response.data) {
        const responseData = response.data as any;
        
        if (responseData.statusCode && responseData.statusCode >= 400) {
          throw new Error(responseData.message || 'Failed to update pay type');
        }
      }
      
      setSuccess('Pay type updated successfully');
      setShowModal(false);
      resetForm();
      fetchPayTypes();
    } catch (err: any) {
      console.error('Update error details:', err);
      
      let errorMessage = 'Failed to update pay type';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Format backend validation errors
      if (errorMessage.includes('minimum')) {
        errorMessage = errorMessage.replace('amount must not be less than 6000', 'Amount must be at least $6,000');
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (payType: PayType) => {
    // Check if pay type can be edited (only draft status)
    if (payType.status !== 'draft') {
      setError('Only DRAFT pay types can be edited. Approved or rejected pay types cannot be modified.');
      return;
    }
    
    setSelectedPayType(payType);
    setFormData({
      type: payType.type,
      amount: payType.amount.toString(),
    });
    
    setShowModal(true);
  };

  const handleViewClick = (payType: PayType) => {
    setSelectedPayType(payType);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: '',
      amount: '',
    });
    setSelectedPayType(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter pay types based on search and status
  const filteredPayTypes = payTypes.filter(payType => {
    const matchesSearch = !filters.search || 
      payType.type.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = !filters.status || payType.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pay Types</h1>
            <p className="text-slate-600 mt-2">Loading pay types...</p>
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
          <h1 className="text-3xl font-bold text-slate-900">Pay Types Configuration</h1>
          <p className="text-slate-600 mt-2">Define employee pay types (hourly, daily, weekly, monthly, contract-based) for salary calculation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPayTypes}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Pay Type
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

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Pay Types
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="Search by pay type name..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status Filter
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ search: '', status: '' })}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Pay Types Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Pay Types ({filteredPayTypes.length})
            {(filters.search || filters.status) && (
              <span className="text-slate-500 text-sm ml-2">of {payTypes.length} total</span>
            )}
          </h2>
        </div>
        
        {filteredPayTypes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 mb-4">💰</div>
            <p className="text-slate-600 font-medium">
              {(filters.search || filters.status) ? 'No pay types match your filters' : 'No pay types found'}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {(filters.search || filters.status) ? 'Try adjusting your search criteria' : 'Create your first pay type to get started'}
            </p>
            {!(filters.search || filters.status) && (
              <button
                onClick={handleCreateClick}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Pay Type
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Pay Type</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Amount</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Created</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayTypes.map((payType) => (
                  <tr key={payType._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-slate-900">{payType.type}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-700 font-medium">
                        {formatCurrency(payType.amount)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[payType.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[payType.status] || payType.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-700">{formatDate(payType.createdAt)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {/* View button - Always visible */}
                        <button
                          onClick={() => handleViewClick(payType)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          👁️
                        </button>
                        
                        {/* Edit button - Only show for DRAFT pay types */}
                        {payType.status === 'draft' && (
                          <button
                            onClick={() => handleEditClick(payType)}
                            className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
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
        <h3 className="font-semibold text-blue-900 mb-2">📋 Payroll Specialist Information</h3>
        <ul className="text-blue-800 text-sm space-y-2">
          <li>• As a Payroll Specialist, you can <span className="font-semibold">create draft</span> pay types</li>
          <li>• You can <span className="font-semibold">edit draft</span> pay types only</li>
          <li>• You can <span className="font-semibold">view all</span> pay types (draft, approved, rejected)</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> pay types cannot be modified</li>
          <li>• Pay types are used to calculate salaries according to employment agreements</li>
          <li>• <span className="font-semibold">Backend Validation:</span> Minimum amount is $6,000 (enforced by backend)</li>
          <li>• <span className="font-semibold">Note:</span> The backend handles all validations including amount minimums, duplicate types, and data integrity</li>
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedPayType ? 'Edit Pay Type' : 'Create Pay Type'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pay Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a pay type</option>
                  {payTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Select the pay type for salary calculation</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500">$</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., 6000"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Base amount for this pay type. <span className="font-semibold">Backend enforces minimum of $6,000</span>
                </p>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-800">ℹ️ Backend Validation Notice</p>
                  <p className="text-xs text-amber-700 mt-1">
                    The backend will validate that the amount meets the minimum requirement of $6,000. 
                    If validation fails, an error message will be displayed above.
                  </p>
                </div>
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
                onClick={selectedPayType ? handleUpdatePayType : handleCreatePayType}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : selectedPayType ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPayType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Pay Type Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedPayType.type}</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusColors[selectedPayType.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[selectedPayType.status] || selectedPayType.status}
                  </span>
                </div>
                <div className="text-slate-600 text-sm">v{selectedPayType.__v || 1}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="font-medium text-slate-900 text-xl">{formatCurrency(selectedPayType.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="font-medium text-slate-900">{statusLabels[selectedPayType.status]}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedPayType.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Last Modified</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedPayType.updatedAt)}</p>
                </div>
                {selectedPayType.createdBy && (
                  <div>
                    <p className="text-sm text-slate-500">Created By</p>
                    <p className="font-medium text-slate-900">{selectedPayType.createdBy}</p>
                  </div>
                )}
              </div>
              
              {selectedPayType.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                  <p className="text-red-700">{selectedPayType.rejectionReason}</p>
                </div>
              )}
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