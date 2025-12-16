'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
// Type definitions based on your API response
interface TerminationBenefit {
  _id: string;
  name: string;
  amount: number;
  terms?: string; // Optional field
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  __v: number;
}

interface TerminationBenefitsResponse {
  data: TerminationBenefit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common termination benefit types for suggestion
const commonTerminationBenefits = [
  { value: 'End of Service Gratuity', label: 'End of Service Gratuity' },
  { value: 'Severance Package - Standard', label: 'Severance Package - Standard' },
  { value: 'Severance Package - Senior', label: 'Severance Package - Senior' },
  { value: 'Notice Period Pay', label: 'Notice Period Pay' },
  { value: 'Accrued Vacation Pay', label: 'Accrued Vacation Pay' },
  { value: 'Unused Sick Leave Pay', label: 'Unused Sick Leave Pay' },
  { value: 'Retirement Benefits', label: 'Retirement Benefits' },
  { value: 'Redundancy Package', label: 'Redundancy Package' },
  { value: 'Voluntary Resignation Package', label: 'Voluntary Resignation Package' },
  { value: 'Medical Benefits Continuation', label: 'Medical Benefits Continuation' },
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

export default function TerminationBenefitsPage() {
  const { user } = useAuth();
  const [terminationBenefits, setTerminationBenefits] = useState<TerminationBenefit[]>([]);
  const [approvedBenefits, setApprovedBenefits] = useState<TerminationBenefit[]>([]); // All approved benefits for calculation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [selectedTerminationBenefit, setSelectedTerminationBenefit] = useState<TerminationBenefit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  
  // Calculate form state
  const [calculateFormData, setCalculateFormData] = useState({
    employeeId: '',
    lastSalary: '',
    yearsOfService: '1',
    reason: 'resignation',
    selectedBenefits: [] as string[], // Array of benefit IDs to include in calculation
  });
  
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
  
  // Form state - terms is optional
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    terms: '',
  });

  // Fetch termination benefits on component mount and when filters change
  useEffect(() => {
    fetchTerminationBenefits();
  }, [pagination.page, filters]);

  // Fetch all approved benefits for calculation (without user filter)
  useEffect(() => {
    fetchApprovedBenefits();
  }, []);

  const fetchApprovedBenefits = async () => {
    try {
      const response = await payrollConfigurationService.getTerminationBenefits({
        status: 'approved',
        limit: 100, // Get all approved benefits
      });
      
      if (response.error) {
        console.error('Error fetching approved benefits:', response.error);
        return;
      }
      
      const apiData = response.data as any;
      if (apiData?.data && Array.isArray(apiData.data)) {
        setApprovedBenefits(apiData.data);
      } else if (Array.isArray(apiData)) {
        setApprovedBenefits(apiData);
      }
    } catch (err) {
      console.error('Error fetching approved benefits for calculation:', err);
    }
  };

  const fetchTerminationBenefits = async () => {
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
      
      const response = await payrollConfigurationService.getTerminationBenefits(queryParams);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setTerminationBenefits([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        // Handle paginated response
        setTerminationBenefits(apiData.data);
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
        setTerminationBenefits(apiData);
        setPagination(prev => ({
          ...prev,
          total: apiData.length,
          totalPages: 1,
        }));
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setTerminationBenefits([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch termination benefits');
      console.error('Error fetching termination benefits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerminationBenefit = async () => {
  try {
    // Basic frontend validation - terms is optional
    if (!formData.name || !formData.amount) {
      setError('Please fill all required fields (Name and Amount)');
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
    
    // Prepare data for backend - terms is optional
    const apiData: any = {
      name: formData.name,
      amount: amountNum,
      createdByEmployeeId: createdByEmployeeId,
    };
    
    // Only add terms if it's not empty
    if (formData.terms.trim() !== '') {
      apiData.terms = formData.terms;
    }
    
    console.log('Creating termination benefit with data:', apiData);
    
    const response = await payrollConfigurationService.createTerminationBenefit(apiData);
    
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
                            'Failed to create termination benefit';
        throw new Error(errorMessage);
      }
    }
    
    setSuccess('Termination benefit created successfully as DRAFT');
    setShowCreateModal(false);
    resetForm();
    fetchTerminationBenefits();
    fetchApprovedBenefits(); // Refresh approved benefits list
  } catch (err: any) {
    console.error('Create error details:', err);
    
    // Extract error message from various possible formats
    let errorMessage = 'Failed to create termination benefit';
    
    if (err.message) {
      errorMessage = err.message;
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    }
    
    // Format specific error messages
    if (errorMessage.includes('already exists')) {
      errorMessage = `Termination benefit "${formData.name}" already exists. Please use a different name.`;
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
  const handleUpdateTerminationBenefit = async () => {
    if (!selectedTerminationBenefit) return;
    
    try {
      // Basic frontend validation - terms is optional
      if (!formData.name || !formData.amount) {
        setError('Please fill all required fields (Name and Amount)');
        return;
      }

      // Convert amount to number
      const amountNum = parseFloat(formData.amount);
      
      if (isNaN(amountNum) || amountNum < 0) {
        setError('Amount must be a valid number 0 or greater');
        return;
      }

      setActionLoading(true);
      
      // Prepare update data - terms is optional
      const updateData: any = {
        name: formData.name,
        amount: amountNum,
      };
      
      // Only add terms if it's not empty or if we're updating from existing value
      if (formData.terms.trim() !== '' || (selectedTerminationBenefit.terms && selectedTerminationBenefit.terms !== formData.terms)) {
        updateData.terms = formData.terms;
      }
      
      const response = await payrollConfigurationService.updateTerminationBenefit(
        selectedTerminationBenefit._id,
        updateData
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Check for backend validation errors
      if (response.data) {
        const responseData = response.data as any;
        
        if (responseData.statusCode && responseData.statusCode >= 400) {
          const errorMessage = responseData.message || 
                              responseData.error?.message || 
                              'Failed to update termination benefit';
          throw new Error(errorMessage);
        }
      }
      
      setSuccess('Termination benefit updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchTerminationBenefits();
      fetchApprovedBenefits(); // Refresh approved benefits list
    } catch (err: any) {
      console.error('Update error details:', err);
      
      let errorMessage = 'Failed to update termination benefit';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Format specific error messages
      if (errorMessage.includes('already exists')) {
        errorMessage = `Termination benefit "${formData.name}" already exists. Please use a different name.`;
      } else if (errorMessage.includes('Cannot update termination benefit with status')) {
        errorMessage = `Cannot update ${selectedTerminationBenefit.status.toLowerCase()} termination benefit. Only DRAFT termination benefits can be edited. Manual adjustments require specialist approval (BR27).`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTerminationBenefit = async (benefit: TerminationBenefit) => {
    if (!confirm(`Are you sure you want to delete the termination benefit "${benefit.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await payrollConfigurationService.deleteTerminationBenefit(benefit._id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess(`Termination benefit "${benefit.name}" deleted successfully`);
      fetchTerminationBenefits();
      fetchApprovedBenefits(); // Refresh approved benefits list
    } catch (err: any) {
      console.error('Delete error:', err);
      
      let errorMessage = 'Failed to delete termination benefit';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('Cannot delete termination benefit with status')) {
        errorMessage = `Cannot delete ${benefit.status.toLowerCase()} termination benefit. Only DRAFT termination benefits can be deleted.`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (benefit: TerminationBenefit) => {
    // Check if termination benefit can be edited (only draft status)
    if (benefit.status !== 'draft') {
      setError(`Cannot edit ${benefit.status.toLowerCase()} termination benefit. Only DRAFT termination benefits can be edited. Manual adjustments require specialist approval (BR27).`);
      return;
    }
    
    setSelectedTerminationBenefit(benefit);
    setFormData({
      name: benefit.name,
      amount: benefit.amount.toString(),
      terms: benefit.terms || '', // Handle optional terms
    });
    
    setShowEditModal(true);
  };

  const handleViewClick = (benefit: TerminationBenefit) => {
    setSelectedTerminationBenefit(benefit);
    setShowViewModal(true);
  };

  const handleCalculateClick = () => {
    // Auto-populate employee ID from logged-in user
    let employeeId = user?.id || '';
    
    // Fallback to localStorage if user.id is not available
    if (!employeeId) {
      try {
        const storedUser = localStorage.getItem('hr_system_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          employeeId = userData.id || userData._id || '';
        }
      } catch (e) {
        console.error('Failed to get user from localStorage:', e);
      }
    }
    
    setCalculateFormData({
      employeeId: employeeId,
      lastSalary: '',
      yearsOfService: '1',
      reason: 'resignation',
      selectedBenefits: [], // Empty = all approved benefits
    });
    setCalculationResult(null);
    setShowCalculateModal(true);
  };

  const handleCalculateEntitlements = async () => {
    try {
      if (!calculateFormData.employeeId || !calculateFormData.lastSalary || !calculateFormData.yearsOfService) {
        setError('Please fill all required fields');
        return;
      }

      const lastSalary = parseFloat(calculateFormData.lastSalary);
      const yearsOfService = parseFloat(calculateFormData.yearsOfService);

      if (isNaN(lastSalary) || lastSalary <= 0) {
        setError('Last salary must be a positive number');
        return;
      }

      if (isNaN(yearsOfService) || yearsOfService < 0) {
        setError('Years of service must be 0 or greater');
        return;
      }

      setActionLoading(true);

      const response = await payrollConfigurationService.calculateTerminationEntitlements({
        employeeId: calculateFormData.employeeId,
        lastSalary,
        yearsOfService,
        reason: calculateFormData.reason,
        benefitIds: calculateFormData.selectedBenefits.length > 0 ? calculateFormData.selectedBenefits : undefined,
      });

      console.log('Calculate API Response:', response);

      if (response.error) {
        throw new Error(response.error);
      }

      // Handle potential response wrapping - backend may return data directly or wrapped
      const respAny = response as any;
      const result = respAny?.data?.data ?? respAny?.data ?? respAny?.result ?? respAny;
      
      console.log('Parsed result:', result);
      
      if (!result || !result.employeeId) {
        console.error('Unexpected response format:', response);
        throw new Error('Invalid response format from server');
      }
      
      setCalculationResult(result);
      setSuccess('Calculation completed successfully');
    } catch (err: any) {
      console.error('Calculation error:', err);
      setError(err.message || 'Failed to calculate entitlements');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCalculateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      terms: '',
    });
    setSelectedTerminationBenefit(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  if (loading && terminationBenefits.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Termination & Resignation Benefits</h1>
            <p className="text-slate-600 mt-2">Loading termination benefits...</p>
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
          <h1 className="text-3xl font-bold text-slate-900">Termination & Resignation Benefits</h1>
          <p className="text-slate-600 mt-2">Configure benefits and terms for employee offboarding to ensure seamless and legally compliant processes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTerminationBenefits}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Benefit
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
              Search Benefits
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="Search by name or terms..."
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

      {/* Termination Benefits Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Termination Benefits ({pagination.total})
            {loading && <span className="text-slate-500 text-sm ml-2">Updating...</span>}
          </h2>
          <div className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages || 1}
          </div>
        </div>
        
        {terminationBenefits.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 mb-4">⚖️</div>
            <p className="text-slate-600 font-medium">No termination benefits found</p>
            <p className="text-slate-500 text-sm mt-1">
              {filters.search || filters.status ? 'Try changing your filters' : 'Create your first termination benefit to get started'}
            </p>
            <button
              onClick={handleCreateClick}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Termination Benefit
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Benefit Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Terms</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Created</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {terminationBenefits.map((benefit) => (
                    <tr key={benefit._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-slate-900">{benefit.name}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-700 font-medium">
                          {formatCurrency(benefit.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-slate-700 text-sm line-clamp-2" title={benefit.terms || 'No terms specified'}>
                          {benefit.terms || <span className="text-slate-400 italic">No terms specified</span>}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[benefit.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[benefit.status] || benefit.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-700 text-sm">
                        {formatDate(benefit.createdAt)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          {/* View button */}
                          <button
                            onClick={() => handleViewClick(benefit)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            👁️
                          </button>
                          
                          {/* Edit button - Only for DRAFT termination benefits */}
                          {benefit.status === 'draft' && (
                            <button
                              onClick={() => handleEditClick(benefit)}
                              className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                          )}
                          
                          {/* Calculate button - Only for APPROVED termination benefits */}
                          {benefit.status === 'approved' && (
                            <button
                              onClick={() => handleCalculateClick()}
                              className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Calculate Entitlements"
                            >
                              🧮
                            </button>
                          )}
                          
                          {/* Delete button - Only for DRAFT termination benefits
                          {benefit.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteTerminationBenefit(benefit)}
                              disabled={actionLoading}
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )} */}
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
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} benefits
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
          <li>• As a Payroll Specialist, you can <span className="font-semibold">create draft</span> termination/resignation benefit policies</li>
          <li>• You can <span className="font-semibold">edit draft</span> termination benefit policies only</li>
          <li>• You can <span className="font-semibold">delete draft</span> termination benefit policies only</li>
          <li>• You can <span className="font-semibold">view all</span> termination benefits (draft, approved, rejected)</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> benefits cannot be modified or deleted</li>
          <li>• Only Payroll Managers can <span className="font-semibold">approve</span> or <span className="font-semibold">reject</span> benefit policies</li>
          <li>• <span className="font-semibold">BR27:</span> Manual adjustments to approved benefits require specialist approval</li>
          <li>• <span className="font-semibold">BR26:</span> HR clearance is required before final approval</li>
          <li>• These policies ensure legally compliant offboarding processes</li>
          <li>• Duplicate benefit names are not allowed</li>
          <li>• <span className="font-semibold">Note:</span> Terms & Conditions field is optional</li>
        </ul>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                Create New Termination Benefit
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Benefit Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                  placeholder="e.g., End of Service Gratuity"
                  list="benefit-suggestions"
                />
                <datalist id="benefit-suggestions">
                  {commonTerminationBenefits.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500 mt-1">
                  Enter a unique name for this termination benefit.
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
                    placeholder="e.g., 5000"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Benefit amount. Must be 0 or greater.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Terms & Conditions (Optional)
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="e.g., Applicable after 2 years of continuous service"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Describe the conditions and terms for this benefit (optional)
                </p>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">ℹ️ Important Notes</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Benefit will be created as <span className="font-semibold">DRAFT</span></li>
                  <li>• Payroll Manager approval is required before use</li>
                  <li>• HR clearance is required (BR26) before final approval</li>
                  <li>• Duplicate benefit names are not allowed</li>
                  <li>• Only you can edit or delete your draft benefits</li>
                  <li>• Manual adjustments to approved benefits require specialist approval (BR27)</li>
                  <li>• Terms & Conditions field is optional</li>
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
                onClick={handleCreateTerminationBenefit}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Creating...' : 'Create Benefit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTerminationBenefit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                Edit Termination Benefit
              </h3>
              <p className="text-slate-600 text-sm mt-1">Editing: {selectedTerminationBenefit.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Benefit Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                  placeholder="e.g., End of Service Gratuity"
                  list="benefit-suggestions-edit"
                />
                <datalist id="benefit-suggestions-edit">
                  {commonTerminationBenefits.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500 mt-1">
                  Enter a unique name for this termination benefit.
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
                    placeholder="e.g., 5000"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Benefit amount.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Terms & Conditions (Optional)
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="e.g., Applicable after 2 years of continuous service"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Describe the conditions and terms for this benefit (optional)
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">⚠️ Editing Notice (BR27)</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• You can only edit DRAFT termination benefits</li>
                  <li>• Changing the benefit name will be checked for duplicates</li>
                  <li>• Once approved, this benefit cannot be edited or deleted</li>
                  <li>• Manual adjustments to approved benefits require specialist approval</li>
                  <li>• Terms & Conditions field is optional</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTerminationBenefit}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Updating...' : 'Update Benefit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTerminationBenefit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Termination Benefit Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedTerminationBenefit.name}</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusColors[selectedTerminationBenefit.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[selectedTerminationBenefit.status] || selectedTerminationBenefit.status}
                  </span>
                </div>
                <div className="text-slate-600 text-sm">v{selectedTerminationBenefit.__v || 1}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Benefit Amount</p>
                  <p className="font-medium text-slate-900 text-xl">{formatCurrency(selectedTerminationBenefit.amount)}</p>
                  <p className="text-xs text-slate-500 mt-1">One-time payment for termination/resignation</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="font-medium text-slate-900">{statusLabels[selectedTerminationBenefit.status]}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedTerminationBenefit.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Last Modified</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedTerminationBenefit.updatedAt)}</p>
                </div>
                {selectedTerminationBenefit.createdBy && (
                  <div>
                    <p className="text-sm text-slate-500">Created By</p>
                    <p className="font-medium text-slate-900">Employee ID: {selectedTerminationBenefit.createdBy.substring(0, 8)}...</p>
                  </div>
                )}
                {selectedTerminationBenefit.approvedBy && (
                  <div>
                    <p className="text-sm text-slate-500">
                      {selectedTerminationBenefit.status === 'approved' ? 'Approved By' : 'Rejected By'}
                    </p>
                    <p className="font-medium text-slate-900">Employee ID: {selectedTerminationBenefit.approvedBy.substring(0, 8)}...</p>
                    {selectedTerminationBenefit.approvedAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(selectedTerminationBenefit.approvedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {selectedTerminationBenefit.terms && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Terms & Conditions</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedTerminationBenefit.terms}</p>
                  </div>
                </div>
              )}
              
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-500 mb-2">Benefit ID</p>
                <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                  {selectedTerminationBenefit._id}
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

      {/* Calculate Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                Calculate Termination Entitlements
              </h3>
              <p className="text-slate-600 text-sm mt-1">Calculate total entitlements based on approved benefits</p>
            </div>
            <div className="p-6 space-y-4">
              {!calculationResult ? (
                <>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Employee:</span> {user ? `${user.firstName} ${user.lastName}` : 'Current User'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      ID: {calculateFormData.employeeId}
                    </p>
                  </div>
                  
                  {/* Benefit Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Benefits to Calculate
                    </label>
                    <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto">
                      {approvedBenefits.length > 0 ? (
                        <>
                          <label className="flex items-center p-3 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={calculateFormData.selectedBenefits.length === 0}
                              onChange={() => {
                                setCalculateFormData(prev => ({
                                  ...prev,
                                  selectedBenefits: []
                                }));
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm font-medium text-slate-700">All Approved Benefits ({approvedBenefits.length})</span>
                          </label>
                          {approvedBenefits.map(benefit => (
                              <label key={benefit._id} className="flex items-center p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={calculateFormData.selectedBenefits.includes(benefit._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCalculateFormData(prev => ({
                                        ...prev,
                                        selectedBenefits: [...prev.selectedBenefits, benefit._id]
                                      }));
                                    } else {
                                      setCalculateFormData(prev => ({
                                        ...prev,
                                        selectedBenefits: prev.selectedBenefits.filter(id => id !== benefit._id)
                                      }));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm text-slate-700">
                                  {benefit.name} <span className="text-slate-500">({formatCurrency(benefit.amount)})</span>
                                </span>
                              </label>
                            ))}
                        </>
                      ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No approved benefits available. Please approve some benefits first.
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {calculateFormData.selectedBenefits.length === 0 
                        ? 'All approved benefits will be included' 
                        : `${calculateFormData.selectedBenefits.length} benefit(s) selected`}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Last Salary (USD) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">$</span>
                      </div>
                      <input
                        type="number"
                        name="lastSalary"
                        value={calculateFormData.lastSalary}
                        onChange={handleCalculateFormChange}
                        className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        placeholder="e.g., 5000"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Years of Service *
                    </label>
                    <input
                      type="number"
                      name="yearsOfService"
                      value={calculateFormData.yearsOfService}
                      onChange={handleCalculateFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      placeholder="e.g., 5"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reason *
                    </label>
                    <select
                      name="reason"
                      value={calculateFormData.reason}
                      onChange={handleCalculateFormChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      <option value="resignation">Resignation</option>
                      <option value="termination">Termination</option>
                    </select>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">ℹ️ Calculation Formulas</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• <span className="font-semibold">Gratuity:</span> Last Salary × 0.5 × Years of Service</li>
                      <li>• <span className="font-semibold">Severance:</span> Last Salary × Years (max 12 months)</li>
                      <li>• <span className="font-semibold">Other Benefits:</span> Base Amount × Years of Service</li>
                      <li className="pt-1 border-t border-blue-200 mt-1">• <span className="font-semibold">BR29:</span> Termination gets 1.5× severance</li>
                      <li>• <span className="font-semibold">BR56:</span> Only APPROVED benefits included</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Calculation Results</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-700">Employee ID:</p>
                        <p className="font-medium text-green-900">{calculationResult.employeeId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-green-700">Reason:</p>
                        <p className="font-medium text-green-900 capitalize">{calculationResult.reason || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-green-700">Last Salary:</p>
                        <p className="font-medium text-green-900">{calculationResult.lastSalary != null ? formatCurrency(calculationResult.lastSalary) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-green-700">Years of Service:</p>
                        <p className="font-medium text-green-900">{calculationResult.yearsOfService ?? 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Benefit</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Base Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Calculated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculationResult.calculations?.length > 0 ? (
                          calculationResult.calculations.map((calc: any, index: number) => (
                            <tr key={index} className="border-t border-slate-100">
                              <td className="py-3 px-4">
                                <p className="font-medium text-slate-900">{calc.benefitName}</p>
                                <p className="text-xs text-slate-500">{calc.formula}</p>
                              </td>
                              <td className="py-3 px-4 text-slate-700">{formatCurrency(calc.baseAmount)}</td>
                              <td className="py-3 px-4 font-medium text-slate-900">{formatCurrency(calc.calculatedAmount)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-6 px-4 text-center text-slate-500">
                              No approved benefits found to calculate
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100">
                        <tr>
                          <td colSpan={2} className="py-3 px-4 font-semibold text-slate-900">Total Entitlement</td>
                          <td className="py-3 px-4 font-bold text-xl text-green-600">{formatCurrency(calculationResult.totalEntitlement || 0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    <p>Calculated on: {calculationResult.calculationDate ? formatDate(calculationResult.calculationDate) : 'N/A'}</p>
                    <p>Business Rules Applied: {calculationResult.businessRulesApplied?.join(', ') || 'None'}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              {calculationResult ? (
                <>
                  <button
                    onClick={() => setCalculationResult(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    New Calculation
                  </button>
                  <button
                    onClick={() => {
                      setShowCalculateModal(false);
                      setCalculationResult(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowCalculateModal(false)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCalculateEntitlements}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-400 transition-colors font-medium"
                  >
                    {actionLoading ? 'Calculating...' : '🧮 Calculate'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}