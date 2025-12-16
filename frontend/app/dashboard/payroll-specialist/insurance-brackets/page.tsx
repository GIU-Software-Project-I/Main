'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';

// Type definitions
interface InsuranceBracket {
  _id: string;
  name: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  __v: number;
}

type ContributionCalculation = {
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  isValid: boolean;
};

// Predefined insurance types
const insuranceTypeOptions = [
  { value: 'Health Insurance', label: 'Health Insurance' },
  { value: 'Social Insurance', label: 'Social Insurance' },
  { value: 'Pension Fund', label: 'Pension Fund' },
  { value: 'Unemployment Insurance', label: 'Unemployment Insurance' },
  { value: 'Disability Insurance', label: 'Disability Insurance' },
  { value: 'Life Insurance', label: 'Life Insurance' },
  { value: 'custom', label: 'Custom Insurance Type' },
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

export default function InsuranceBracketsPage() {
  const { user } = useAuth();
  const [brackets, setBrackets] = useState<InsuranceBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<InsuranceBracket | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [calculationResult, setCalculationResult] = useState<ContributionCalculation | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    customName: '',
    amount: '',
    minSalary: '',
    maxSalary: '',
    employeeRate: '',
    employerRate: '',
  });

  // Calculation form state
  const [calculationData, setCalculationData] = useState({
    salary: '',
  });

  // Fetch insurance brackets on component mount
  useEffect(() => {
    fetchInsuranceBrackets();
  }, []);

  const fetchInsuranceBrackets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await payrollConfigurationService.getInsuranceBrackets();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setBrackets([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        setBrackets(apiData.data);
      } 
      else if (Array.isArray(apiData)) {
        setBrackets(apiData);
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setBrackets([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch insurance brackets');
      console.error('Error fetching insurance brackets:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Determine the final name
    const finalName = formData.name === 'custom' ? formData.customName : formData.name;

    // Required fields validation
    if (!selectedBracket) {
      // Only validate name for new creation
      if (!formData.name) {
        errors.push('Please select an insurance type');
      } else if (formData.name === 'custom' && !formData.customName.trim()) {
        errors.push('Custom insurance name is required');
      }

      // Check for duplicate name only when creating new
      if (finalName) {
        const isDuplicate = brackets.some(bracket => 
          bracket.name.toLowerCase() === finalName.toLowerCase()
        );
        if (isDuplicate) {
          errors.push(`Insurance name "${finalName}" already exists. Please use a different name.`);
        }
      }
    }

    // Required numeric fields
    if (!formData.amount) errors.push('Amount is required');
    if (!formData.minSalary) errors.push('Minimum salary is required');
    if (!formData.maxSalary) errors.push('Maximum salary is required');
    if (!formData.employeeRate) errors.push('Employee rate is required');
    if (!formData.employerRate) errors.push('Employer rate is required');

    // Numeric validation
    const amount = parseFloat(formData.amount);
    const minSalary = parseFloat(formData.minSalary);
    const maxSalary = parseFloat(formData.maxSalary);
    const employeeRate = parseFloat(formData.employeeRate);
    const employerRate = parseFloat(formData.employerRate);

    if (isNaN(amount) || amount < 0) errors.push('Amount must be a positive number');
    if (isNaN(minSalary) || minSalary < 0) errors.push('Minimum salary must be a positive number');
    if (isNaN(maxSalary) || maxSalary < 0) errors.push('Maximum salary must be a positive number');
    if (isNaN(employeeRate) || employeeRate < 0 || employeeRate > 100) errors.push('Employee rate must be between 0 and 100');
    if (isNaN(employerRate) || employerRate < 0 || employerRate > 100) errors.push('Employer rate must be between 0 and 100');

    // Logical validation
    if (minSalary >= maxSalary) errors.push('Maximum salary must be greater than minimum salary');
    if (employeeRate + employerRate > 100) errors.push('Total contribution rate (employee + employer) cannot exceed 100%');

    return errors;
  };

  const handleCreateInsurance = async () => {
    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      // Determine the final name
      const finalName = formData.name === 'custom' ? formData.customName : formData.name;

      // Check if user is authenticated and has an ID
      if (!user?.id) {
        setError('You must be logged in to create an insurance bracket');
        return;
      }

      console.log('Current user ID:', user.id); // Debug log
      console.log('User object:', user); // Debug log

      setActionLoading(true);
      
      const apiData = {
        name: finalName,
        amount: parseFloat(formData.amount),
        minSalary: parseFloat(formData.minSalary),
        maxSalary: parseFloat(formData.maxSalary),
        employeeRate: parseFloat(formData.employeeRate),
        employerRate: parseFloat(formData.employerRate),
        createdByEmployeeId: user.id, // Make sure this is the employee ID, not user ID
      };
      
      console.log('Sending API data:', apiData); // Debug log
      
      const response = await payrollConfigurationService.createInsuranceBracket(apiData);
      
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
                              'Failed to create insurance bracket';
          throw new Error(errorMessage);
        }
      }
      
      setSuccess('Insurance bracket created successfully as DRAFT');
      setShowModal(false);
      resetForm();
      fetchInsuranceBrackets();
    } catch (err: any) {
      console.error('Create error details:', err);
      
      let errorMessage = 'Failed to create insurance bracket';
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

  const handleUpdateInsurance = async () => {
    if (!selectedBracket) return;

    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      if (selectedBracket.status !== 'draft') {
        setError('Only DRAFT insurance brackets can be edited.');
        return;
      }

      setActionLoading(true);
      setError(null);

      const updateData = {
        // Name is NOT included here - cannot be changed after creation
        amount: parseFloat(formData.amount),
        minSalary: parseFloat(formData.minSalary),
        maxSalary: parseFloat(formData.maxSalary),
        employeeRate: parseFloat(formData.employeeRate),
        employerRate: parseFloat(formData.employerRate),
      };

      const response = await payrollConfigurationService.updateInsuranceBracket(
        selectedBracket._id,
        updateData
      );
      
      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Insurance bracket updated successfully');
      setShowModal(false);
      resetForm();
      fetchInsuranceBrackets();

    } catch (err: any) {
      setError(err.message || 'Failed to update insurance bracket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInsurance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insurance bracket? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await payrollConfigurationService.deleteInsuranceBracket(id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Insurance bracket deleted successfully');
      fetchInsuranceBrackets();
    } catch (err: any) {
      setError(err.message || 'Failed to delete insurance bracket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculateContributions = async () => {
    if (!selectedBracket) return;

    try {
      const salary = parseFloat(calculationData.salary);
      if (isNaN(salary) || salary < 0) {
        setError('Please enter a valid positive salary amount');
        setCalculationResult(null);
        return;
      }

      setActionLoading(true);
      setCalculationResult(null); // Clear previous results
      setError(null); // Clear previous errors

      const response = await payrollConfigurationService.calculateContributions(
        selectedBracket._id,
        salary
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const result = response.data as ContributionCalculation;

        // Set calculation result
        setCalculationResult(result);

        // Show error only if salary is invalid
        if (!result.isValid) {
          setError(
            `Salary does not fall within this insurance bracket range (${selectedBracket.minSalary} - ${selectedBracket.maxSalary})`
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate contributions');
      setCalculationResult(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (bracket: InsuranceBracket) => {
    // Check if bracket can be edited (only draft status)
    if (bracket.status !== 'draft') {
      setError('Only DRAFT insurance brackets can be edited. Approved or rejected brackets cannot be modified.');
      return;
    }
    
    setSelectedBracket(bracket);
    setFormData({
      name: '', // Not used for editing - display only
      customName: '', // Not used for editing - display only
      amount: bracket.amount.toString(),
      minSalary: bracket.minSalary.toString(),
      maxSalary: bracket.maxSalary.toString(),
      employeeRate: bracket.employeeRate.toString(),
      employerRate: bracket.employerRate.toString(),
    });
    
    setShowModal(true);
  };

  const handleViewClick = (bracket: InsuranceBracket) => {
    setSelectedBracket(bracket);
    setShowViewModal(true);
  };

  const handleCalculateClick = (bracket: InsuranceBracket) => {
    setSelectedBracket(bracket);
    setCalculationData({ salary: '' });
    setCalculationResult(null);
    setError(null); // Clear any previous errors
    setShowCalculateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      customName: '',
      amount: '',
      minSalary: '',
      maxSalary: '',
      employeeRate: '',
      employerRate: '',
    });
    setSelectedBracket(null);
    setCalculationResult(null);
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

  const handleCalculationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalculationData(prev => ({
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Insurance Brackets</h1>
            <p className="text-slate-600 mt-2">Loading insurance brackets...</p>
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
          <h1 className="text-3xl font-bold text-slate-900">Insurance Brackets Configuration</h1>
          <p className="text-slate-600 mt-2">
            Define insurance brackets with salary ranges and contribution percentages for automatic payroll deductions
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchInsuranceBrackets}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Insurance Bracket
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

      {/* Insurance Brackets Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Insurance Brackets ({brackets.length})</h2>
        </div>
        
        {brackets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 mb-4">🛡️</div>
            <p className="text-slate-600 font-medium">No insurance brackets found</p>
            <p className="text-slate-500 text-sm mt-1">Create your first insurance bracket to get started</p>
            <button
              onClick={handleCreateClick}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Insurance Bracket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Insurance Type</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Salary Range</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Contributions</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Amount</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Created</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brackets.map((bracket) => (
                  <tr key={bracket._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-slate-900">{bracket.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <p className="text-slate-700">
                          {formatCurrency(bracket.minSalary)} - {formatCurrency(bracket.maxSalary)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <p className="text-slate-600">
                          Employee: <span className="font-medium">{formatPercentage(bracket.employeeRate)}</span>
                        </p>
                        <p className="text-slate-600">
                          Employer: <span className="font-medium">{formatPercentage(bracket.employerRate)}</span>
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-700 font-medium">
                        {formatCurrency(bracket.amount)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[bracket.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[bracket.status] || bracket.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-700 text-sm">{formatDate(bracket.createdAt)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {/* View button */}
                        <button
                          onClick={() => handleViewClick(bracket)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          👁️
                        </button>
                        
                        {/* Calculate button */}
                        <button
                          onClick={() => handleCalculateClick(bracket)}
                          className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Calculate Contributions"
                        >
                          🧮
                        </button>
                        
                        {/* Edit button - Only show for DRAFT brackets */}
                        {bracket.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEditClick(bracket)}
                              className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            
                            {/* Delete button - Only for DRAFT brackets */}
                           
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
        <h3 className="font-semibold text-blue-900 mb-2">📋 Payroll Specialist Information - Insurance Brackets</h3>
        <ul className="text-blue-800 text-sm space-y-2">
          <li>• As a Payroll Specialist, you can <span className="font-semibold">create draft</span> insurance brackets</li>
          <li>• You can <span className="font-semibold">edit draft</span> insurance brackets only (not approved or rejected ones)</li>
          <li>• You can <span className="font-semibold">delete draft</span> insurance brackets</li>
          <li>• You can <span className="font-semibold">view all</span> insurance brackets (draft, approved, rejected)</li>
          <li>• You can <span className="font-semibold">calculate contributions</span> for any insurance bracket</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> brackets cannot be modified</li>
          <li>• <span className="font-semibold">Note:</span> Insurance type/name cannot be changed after creation</li>
          <li>• Insurance brackets define salary ranges and contribution percentages for automatic payroll deductions</li>
          <li>• <span className="font-semibold">Compliance:</span> Configurations must follow Social Insurance and Pensions Law</li>
          <li>• <span className="font-semibold">Note:</span> HR Manager has exclusive approval authority for insurance configurations</li>
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedBracket ? 'Edit Insurance Bracket' : 'Create Insurance Bracket'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Insurance Type {selectedBracket && <span className="text-slate-400">(Cannot be changed)</span>}
                </label>
                {selectedBracket ? (
                  // Show as read-only display when editing
                  <div className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-medium">
                    {selectedBracket.name}
                  </div>
                ) : (
                  // Show normal dropdown when creating
                  <>
                    <select
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select insurance type</option>
                      {insuranceTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      {formData.name === 'custom' 
                        ? 'Enter a custom insurance name below' 
                        : 'Select a predefined insurance type or choose "Custom Insurance Type"'}
                    </p>
                  </>
                )}
              </div>
              
              {/* Custom Name Input - Only shown when creating and "Custom Insurance Type" is selected */}
              {formData.name === 'custom' && !selectedBracket && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Custom Insurance Name *
                  </label>
                  <input
                    type="text"
                    name="customName"
                    value={formData.customName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={formData.name === 'custom'}
                    placeholder="e.g., Vision Insurance, Dental Insurance, etc."
                    maxLength={100}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter a unique name for your custom insurance type. 
                    {formData.customName && (
                      <span className="ml-1">
                        {brackets.some(bracket => 
                          bracket.name.toLowerCase() === formData.customName.toLowerCase()
                        ) ? (
                          <span className="text-red-600 font-medium">⚠️ This name already exists!</span>
                        ) : (
                          <span className="text-green-600">✓ Available</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Minimum Salary *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">$</span>
                    </div>
                    <input
                      type="number"
                      name="minSalary"
                      value={formData.minSalary}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="e.g., 0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Minimum salary for this bracket</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Maximum Salary *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">$</span>
                    </div>
                    <input
                      type="number"
                      name="maxSalary"
                      value={formData.maxSalary}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="e.g., 10000"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Maximum salary for this bracket</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Employee Contribution Rate (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="employeeRate"
                      value={formData.employeeRate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="e.g., 5"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Employee's contribution percentage</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Employer Contribution Rate (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="employerRate"
                      value={formData.employerRate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="e.g., 10"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Employer's contribution percentage</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Base Amount *
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
                    placeholder="e.g., 500"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Base insurance amount for this bracket</p>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">ℹ️ Important Notes</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Maximum salary must be greater than minimum salary</li>
                  <li>• Contribution rates must be between 0% and 100%</li>
                  <li>• Total contribution rate (employee + employer) cannot exceed 100%</li>
                  <li>• Insurance name must be unique - duplicates are not allowed</li>
                  <li>• <span className="font-semibold">Insurance type/name cannot be changed after creation</span></li>
                  <li>• All brackets start in DRAFT status and require HR Manager approval</li>
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
                onClick={selectedBracket ? handleUpdateInsurance : handleCreateInsurance}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : selectedBracket ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedBracket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Insurance Bracket Details</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedBracket.name}</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusColors[selectedBracket.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[selectedBracket.status] || selectedBracket.status}
                  </span>
                </div>
                <div className="text-slate-600 text-sm">ID: {selectedBracket._id.substring(0, 8)}...</div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Salary Range</p>
                    <p className="font-medium text-slate-900 text-xl">
                      {formatCurrency(selectedBracket.minSalary)} - {formatCurrency(selectedBracket.maxSalary)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500">Base Amount</p>
                    <p className="font-medium text-slate-900 text-xl">{formatCurrency(selectedBracket.amount)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="font-medium text-slate-900">{statusLabels[selectedBracket.status]}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Employee Contribution</p>
                    <p className="font-medium text-slate-900 text-xl">{formatPercentage(selectedBracket.employeeRate)}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatCurrency(selectedBracket.amount * selectedBracket.employeeRate / 100)} per period
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500">Employer Contribution</p>
                    <p className="font-medium text-slate-900 text-xl">{formatPercentage(selectedBracket.employerRate)}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatCurrency(selectedBracket.amount * selectedBracket.employerRate / 100)} per period
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500">Total Contribution Rate</p>
                    <p className="font-medium text-slate-900 text-xl">
                      {formatPercentage(selectedBracket.employeeRate + selectedBracket.employerRate)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedBracket.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Last Modified</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedBracket.updatedAt)}</p>
                </div>
                {selectedBracket.createdBy && (
                  <div>
                    <p className="text-sm text-slate-500">Created By</p>
                    <p className="font-medium text-slate-900">{selectedBracket.createdBy}</p>
                  </div>
                )}
                {selectedBracket.approvedBy && (
                  <div>
                    <p className="text-sm text-slate-500">Approved By</p>
                    <p className="font-medium text-slate-900">{selectedBracket.approvedBy}</p>
                  </div>
                )}
                {selectedBracket.approvedAt && (
                  <div>
                    <p className="text-sm text-slate-500">Approved At</p>
                    <p className="font-medium text-slate-900">{formatDate(selectedBracket.approvedAt)}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
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

      {/* Calculate Contributions Modal */}
      {showCalculateModal && selectedBracket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Calculate Contributions</h3>
              <p className="text-slate-600 text-sm mt-1">{selectedBracket.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Employee Salary *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500">$</span>
                  </div>
                  <input
                    type="number"
                    name="salary"
                    value={calculationData.salary}
                    onChange={handleCalculationChange}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., 5000"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the employee's gross salary to calculate insurance contributions
                </p>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Bracket Information:</p>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>• Salary Range: {formatCurrency(selectedBracket.minSalary)} - {formatCurrency(selectedBracket.maxSalary)}</p>
                  <p>• Employee Rate: {formatPercentage(selectedBracket.employeeRate)}</p>
                  <p>• Employer Rate: {formatPercentage(selectedBracket.employerRate)}</p>
                  <p>• Base Amount: {formatCurrency(selectedBracket.amount)}</p>
                </div>
              </div>
              
              {calculationResult && (
                <div className={`border rounded-lg p-4 ${calculationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h4 className="font-semibold text-slate-900 mb-3">Calculation Results</h4>
                  
                  {calculationResult.isValid ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-slate-600">Employee Contribution</p>
                          <p className="text-xl font-bold text-green-700">
                            {formatCurrency(calculationResult.employeeContribution)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Employer Contribution</p>
                          <p className="text-xl font-bold text-blue-700">
                            {formatCurrency(calculationResult.employerContribution)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-green-200">
                          <p className="text-sm text-slate-600">Total Contribution</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {formatCurrency(calculationResult.totalContribution)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">✓ Valid Salary</p>
                        <p className="text-xs text-green-700 mt-1">
                          The salary falls within this bracket's range
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-red-600 text-2xl mb-2">⚠️</div>
                      <p className="font-medium text-red-800">Invalid Salary</p>
                      <p className="text-red-700 text-sm mt-1">
                        The entered salary does not fall within this insurance bracket's range
                      </p>
                      <p className="text-red-600 text-sm mt-2">
                        Required range: {formatCurrency(selectedBracket.minSalary)} - {formatCurrency(selectedBracket.maxSalary)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCalculateModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={handleCalculateContributions}
                disabled={actionLoading || !calculationData.salary}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}