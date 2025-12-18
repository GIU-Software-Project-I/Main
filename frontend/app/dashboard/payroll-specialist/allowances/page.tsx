'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';

// Type definitions based on your API response
interface Allowance {
  _id: string;
  name: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  __v: number;
}

interface AllowancesResponse {
  data: Allowance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common allowance types for suggestion
const commonAllowanceTypes = [
  { value: 'Housing Allowance', label: 'Housing Allowance' },
  { value: 'Transportation Allowance', label: 'Transportation Allowance' },
  { value: 'Meal Allowance', label: 'Meal Allowance' },
  { value: 'Medical Allowance', label: 'Medical Allowance' },
  { value: 'Education Allowance', label: 'Education Allowance' },
  { value: 'Travel Allowance', label: 'Travel Allowance' },
  { value: 'Overtime Allowance', label: 'Overtime Allowance' },
  { value: 'Uniform Allowance', label: 'Uniform Allowance' },
  { value: 'Communication Allowance', label: 'Communication Allowance' },
  { value: 'Entertainment Allowance', label: 'Entertainment Allowance' },
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

export default function AllowancesPage() {
  const { user } = useAuth();
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<Allowance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Search and filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
  });

  // Fetch allowances on component mount and when filters change
  useEffect(() => {
    fetchAllowances();
  }, [pagination.page, filters]);

  const fetchAllowances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user ID for filtering (if needed)
      let currentUserId = '';
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            currentUserId = user.id || user._id || '';
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        createdByEmployeeId: currentUserId || undefined,
      };
      
      const response = await payrollConfigurationService.getAllowances(queryParams);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setAllowances([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        // Handle paginated response
        setAllowances(apiData.data);
        setPagination(prev => ({
          ...prev,
          total: apiData.total || 0,
          totalPages: apiData.totalPages || 0,
          page: apiData.page || 1,
          limit: apiData.limit || 10,
        }));
      } 
      else if (Array.isArray(apiData)) {
        // Handle non-paginated response
        setAllowances(apiData);
        setPagination(prev => ({
          ...prev,
          total: apiData.length,
          totalPages: 1,
        }));
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setAllowances([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch allowances');
      console.error('Error fetching allowances:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllowance = async () => {
  try {
    // Basic frontend validation
    if (!formData.name || !formData.amount) {
      setError('Please fill all required fields');
      return;
    }

    // Convert amount to number
    const amountNum = parseFloat(formData.amount);
    
    if (isNaN(amountNum) || amountNum < 0) {
      setError('Amount must be a valid number 0 or greater');
      return;
    }

    setActionLoading(true);
    
    // Get the employee ID - REQUIRED by backend DTO
    let createdByEmployeeId = user?.id || '';
    
    // Fallback to localStorage if user.id is not available
    if (!createdByEmployeeId) {
      try {
        const storedUser = localStorage.getItem('hr_system_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          createdByEmployeeId = userData.id || userData._id || '';
        }
      } catch (e) {
        console.error('Failed to get user from localStorage:', e);
      }
    }
    
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
    
    // Prepare data for backend
    const apiData = {
      name: formData.name,
      amount: amountNum,
      createdByEmployeeId: createdByEmployeeId,
    };
    
    console.log('Creating allowance with data:', apiData);
    
    const response = await payrollConfigurationService.createAllowance(apiData);
    
    // Handle response
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
                            'Failed to create allowance';
        throw new Error(errorMessage);
      }
    }
    
    setSuccess('Allowance created successfully as DRAFT');
    setShowCreateModal(false);
    resetForm();
    fetchAllowances();
  } catch (err: any) {
    console.error('Create error details:', err);
    
    // Extract error message from various possible formats
    let errorMessage = 'Failed to create allowance';
    
    if (err.message) {
      errorMessage = err.message;
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    }
    
    // Format specific error messages
    if (errorMessage.includes('already exists')) {
      errorMessage = `Allowance "${formData.name}" already exists. Please use a different name.`;
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
  const handleDeleteAllowance = async (allowance: Allowance) => {
    if (!confirm(`Are you sure you want to delete "${allowance.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await payrollConfigurationService.deleteAllowance(allowance._id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess(`Allowance "${allowance.name}" deleted successfully`);
      fetchAllowances();
    } catch (err: any) {
      console.error('Delete error:', err);
      
      let errorMessage = 'Failed to delete allowance';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('Cannot delete allowance with status')) {
        errorMessage = `Cannot delete ${allowance.status.toLowerCase()} allowance. Only DRAFT allowances can be deleted.`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewClick = (allowance: Allowance) => {
    setSelectedAllowance(allowance);
    setShowViewModal(true);
  };

  const handleEditClick = (allowance: Allowance) => {
    setSelectedAllowance(allowance);
    setFormData({
      name: allowance.name,
      amount: allowance.amount.toString(),
    });
    setShowEditModal(true);
  };

  const handleUpdateAllowance = async () => {
    if (!selectedAllowance) return;
    
    try {
      if (!formData.name || !formData.amount) {
        setError('Please fill all required fields');
        return;
      }

      const amountNum = parseFloat(formData.amount);
      
      if (isNaN(amountNum) || amountNum < 0) {
        setError('Amount must be a valid number 0 or greater');
        return;
      }

      setActionLoading(true);
      
      const apiData = {
        name: formData.name,
        amount: amountNum,
      };
      
      console.log('Updating allowance with data:', apiData);
      
      const response = await payrollConfigurationService.updateAllowance(selectedAllowance._id, apiData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Allowance updated successfully');
      setShowEditModal(false);
      setSelectedAllowance(null);
      resetForm();
      fetchAllowances();
    } catch (err: any) {
      console.error('Update error:', err);
      let errorMessage = 'Failed to update allowance';
      if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
    });
  };

  const handleCreateClick = () => {
    resetForm();
    setShowCreateModal(true);
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
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

  if (loading && allowances.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Allowances</h1>
            <p className="text-slate-600 mt-2">Loading allowances...</p>
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
          <h1 className="text-3xl font-bold text-slate-900">Allowances Configuration</h1>
          <p className="text-slate-600 mt-2">Define and manage employee allowances (transportation, housing, meals, etc.)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAllowances}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Allowance
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
            <p className="text-red-800 font-medium">Error</p>
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
        Search Allowances
      </label>
      <input
        type="text"
        name="search"
        value={filters.search}
        onChange={handleFilterChange}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
        placeholder="Search by name..."
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
        onClick={() => {
          setFilters({ search: '', status: '' });
          setPagination(prev => ({ ...prev, page: 1 }));
        }}
        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium w-full"
      >
        Clear Filters
      </button>
    </div>
  </div>
</div>

      {/* Allowances Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Allowances ({pagination.total})
            {loading && <span className="text-slate-500 text-sm ml-2">Updating...</span>}
          </h2>
          <div className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages || 1}
          </div>
        </div>
        
        {allowances.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 mb-4">🏢</div>
            <p className="text-slate-600 font-medium">No allowances found</p>
            <p className="text-slate-500 text-sm mt-1">
              {filters.search || filters.status ? 'Try changing your filters' : 'Create your first allowance to get started'}
            </p>
            <button
              onClick={handleCreateClick}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Allowance
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Allowance Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Created</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
              <tbody>
  {allowances.map((allowance) => (
    <tr key={allowance._id} className="border-b border-slate-100 hover:bg-slate-50">
      <td className="py-4 px-6">
        <div>
          <p className="font-medium text-slate-900">{allowance.name}</p>
          {/* Remove this line: */}
          {/* <p className="text-slate-500 text-sm mt-1">ID: {allowance._id.substring(0, 8)}...</p> */}
        </div>
      </td>
      <td className="py-4 px-6">
        <span className="text-slate-700 font-medium">
          {formatCurrency(allowance.amount)}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[allowance.status] || 'bg-gray-100 text-gray-800'}`}>
          {statusLabels[allowance.status] || allowance.status}
        </span>
      </td>
      <td className="py-4 px-6 text-slate-700 text-sm">
        {formatDate(allowance.createdAt)}
      </td>
      <td className="py-4 px-6">
        <div className="flex gap-2">
          {/* View button */}
          <button
            onClick={() => handleViewClick(allowance)}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View Details"
          >
            👁️
          </button>
          
          {/* Edit button - Only for DRAFT allowances */}
          {allowance.status === 'draft' && (
            <button
              onClick={() => handleEditClick(allowance)}
              className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Edit Allowance"
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-6 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} allowances
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="px-3 py-1 border border-slate-300 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className={`px-3 py-1 rounded ${pagination.page === pageNum ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || loading}
                    className="px-3 py-1 border border-slate-300 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Payroll Specialist Information</h3>
        <ul className="text-blue-800 text-sm space-y-2">
          <li>• As a Payroll Specialist, you can <span className="font-semibold">create draft</span> allowances</li>
          <li>• You can <span className="font-semibold">view all</span> allowances (draft, approved, rejected)</li>
          <li>• You can <span className="font-semibold">delete draft</span> allowances only</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> allowances cannot be modified or deleted</li>
          <li>• Only Payroll Managers can <span className="font-semibold">approve</span> or <span className="font-semibold">reject</span> allowances</li>
          <li>• Allowances are used to reward employees for special conditions (housing, transportation, etc.)</li>
          <li>• Duplicate allowance names are not allowed</li>
        </ul>
      </div>

  {/* Create Modal */}
{showCreateModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-900">
          Create New Allowance
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Allowance Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
            placeholder="e.g., Transportation Allowance"
            list="allowance-suggestions"
          />
          <datalist id="allowance-suggestions">
            {commonAllowanceTypes.map((option) => (
              <option key={option.value} value={option.value} />
            ))}
          </datalist>
          <p className="text-xs text-slate-500 mt-1">
            Enter a unique name for this allowance. Common types include Housing, Transportation, Meal, etc.
          </p>
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
              className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              required
              placeholder="e.g., 500"
              step="0.01"
              min="0"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monthly amount for this allowance. Must be 0 or greater.
          </p>
        </div>
        
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-2">ℹ️ Important Notes</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Allowance will be created as <span className="font-semibold">DRAFT</span></li>
            <li>• Payroll Manager approval is required before use</li>
            <li>• Duplicate names are not allowed</li>
            <li>• Only you can delete your draft allowances</li>
          </ul>
        </div>
      </div>
      <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
        <button
          onClick={() => setShowCreateModal(false)}
          disabled={actionLoading}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateAllowance}
          disabled={actionLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
        >
          {actionLoading ? 'Creating...' : 'Create Allowance'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* View Modal */}
      {showViewModal && selectedAllowance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Allowance Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedAllowance.name}</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusColors[selectedAllowance.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[selectedAllowance.status] || selectedAllowance.status}
                  </span>
                </div>
                <div className="text-slate-600 text-sm">v{selectedAllowance.__v || 1}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="font-medium text-slate-900 text-xl">{formatCurrency(selectedAllowance.amount)}</p>
                  <p className="text-xs text-slate-500 mt-1">Monthly amount</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="font-medium text-slate-900">{statusLabels[selectedAllowance.status]}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedAllowance.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Last Modified</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedAllowance.updatedAt)}</p>
                </div>
                {selectedAllowance.createdBy && (
                  <div>
                    <p className="text-sm text-slate-500">Created By</p>
                    <p className="font-medium text-slate-900">Employee ID: {selectedAllowance.createdBy.substring(0, 8)}...</p>
                  </div>
                )}
                {selectedAllowance.approvedBy && (
                  <div>
                    <p className="text-sm text-slate-500">
                      {selectedAllowance.status === 'approved' ? 'Approved By' : 'Rejected By'}
                    </p>
                    <p className="font-medium text-slate-900">Employee ID: {selectedAllowance.approvedBy.substring(0, 8)}...</p>
                    {selectedAllowance.approvedAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(selectedAllowance.approvedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-500 mb-2">Allowance ID</p>
                <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                  {selectedAllowance._id}
                </code>
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

      {/* Edit Modal */}
      {showEditModal && selectedAllowance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                Edit Allowance
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Allowance Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                  placeholder="e.g., Transportation Allowance"
                  list="allowance-suggestions-edit"
                />
                <datalist id="allowance-suggestions-edit">
                  {commonAllowanceTypes.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
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
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                    placeholder="e.g., 500"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Current Status:</span> {statusLabels[selectedAllowance.status]}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAllowance(null);
                  resetForm();
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAllowance}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}