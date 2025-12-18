'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit, X } from 'lucide-react';

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

interface TaxRuleGroup {
  baseName: string;
  description?: string;
  rules: TaxRule[];
  expanded: boolean;
}

interface Bracket {
  id: number;
  bracketNumber: number;
  range: string;
  rate: string;
}

interface Component {
  id: number;
  name: string;
  custom: boolean;
  rate: string;
}

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

// Predefined component types
const componentTypes = [
  'Income Tax',
  'Corporate Tax',
  'Value Added Tax (VAT)',
  'Withholding Tax',
  'Capital Gains Tax',
  'Property Tax',
  'Excise Tax',
  'Customs Duty',
  'Social Security',
  'Health Insurance',
  'Pension Fund',
  'Unemployment Tax'
];

export default function TaxRulesPage() {
  const { user } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [taxRuleGroups, setTaxRuleGroups] = useState<TaxRuleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTaxRule, setSelectedTaxRule] = useState<TaxRule | null>(null);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<TaxRuleGroup | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
 
  // Form state for creating
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseRate: '', // For simple tax rule without brackets/components
  });

  const [brackets, setBrackets] = useState<Bracket[]>([
    { id: 1, bracketNumber: 1, range: '0-50,000', rate: '0' },
    { id: 2, bracketNumber: 2, range: '50,001-100,000', rate: '10' },
    { id: 3, bracketNumber: 3, range: '100,001-150,000', rate: '15' },
  ]);

  const [components, setComponents] = useState<Component[]>([
    { id: 1, name: 'Income Tax', custom: false, rate: '5' },
    { id: 2, name: 'Excise Tax', custom: false, rate: '7' },
  ]);

  const [hasBrackets, setHasBrackets] = useState(false);
  const [hasComponents, setHasComponents] = useState(false);

  // Form state for editing
  const [editFormData, setEditFormData] = useState({
    description: '',
    baseRate: '',
  });

  const [editBrackets, setEditBrackets] = useState<Bracket[]>([]);
  const [editComponents, setEditComponents] = useState<Component[]>([]);

  // Fetch tax rules on component mount
  useEffect(() => {
    fetchTaxRules();
  }, []);

  // Group tax rules by base name whenever taxRules change
  useEffect(() => {
    if (taxRules.length > 0) {
      const groups: Record<string, TaxRuleGroup> = {};
      
      taxRules.forEach(rule => {
        const parts = rule.name.split(' - ');
        const baseName = parts[0]?.trim() || rule.name;
        
        if (!groups[baseName]) {
          groups[baseName] = {
            baseName,
            description: rule.description?.split('\n')[0], // Get first line as group description
            rules: [],
            expanded: false
          };
        }
        
        groups[baseName].rules.push(rule);
      });
      
      // Sort rules within each group
      Object.values(groups).forEach(group => {
        group.rules.sort((a, b) => {
          // Sort brackets first by bracket number
          const aIsBracket = a.name.includes('Bracket');
          const bIsBracket = b.name.includes('Bracket');
          
          if (aIsBracket && bIsBracket) {
            const aMatch = a.name.match(/Bracket\s+(\d+)/);
            const bMatch = b.name.match(/Bracket\s+(\d+)/);
            const aNum = aMatch ? parseInt(aMatch[1]) : 0;
            const bNum = bMatch ? parseInt(bMatch[1]) : 0;
            return aNum - bNum;
          }
          
          if (aIsBracket && !bIsBracket) return -1;
          if (!aIsBracket && bIsBracket) return 1;
          
          return a.name.localeCompare(b.name);
        });
      });
      
      setTaxRuleGroups(Object.values(groups));
    } else {
      setTaxRuleGroups([]);
    }
  }, [taxRules]);

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

    if (!formData.name.trim()) {
      errors.push('Tax rule name is required');
    }

    // Validate brackets
    if (hasBrackets) {
      for (let i = 0; i < brackets.length; i++) {
        const bracket = brackets[i];
        if (!bracket.range.trim()) {
          errors.push(`Bracket ${bracket.bracketNumber}: Range is required`);
        }
        const rate = parseFloat(bracket.rate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
          errors.push(`Bracket ${bracket.bracketNumber}: Rate must be between 0% and 100%`);
        }
        
        // Validate range format and continuity
        if (i > 0) {
          const prevRange = brackets[i-1].range;
          const currentRange = bracket.range;
          
          // Extract upper bound from previous range
          const prevUpperMatch = prevRange.match(/(\d+(?:,\d+)*)\+?$/);
          const currentLowerMatch = currentRange.match(/^(\d+(?:,\d+)*)/);
          
          if (prevUpperMatch && currentLowerMatch) {
            const prevUpper = parseInt(prevUpperMatch[1].replace(/,/g, ''));
            const currentLower = parseInt(currentLowerMatch[1].replace(/,/g, ''));
            
            if (currentLower !== prevUpper + 1) {
              errors.push(`Bracket ${bracket.bracketNumber}: Range should start at ${(prevUpper + 1).toLocaleString()} (previous bracket ends at ${prevUpper.toLocaleString()})`);
            }
          }
        }
      }
    }

    // Validate components
    if (hasComponents) {
      for (const component of components) {
        if (!component.name.trim()) {
          errors.push('Component name is required');
        }
        const rate = parseFloat(component.rate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
          errors.push(`${component.name}: Rate must be between 0% and 100%`);
        }
      }
    }

    // Validate base rate if no brackets or components
    if (!hasBrackets && !hasComponents) {
      const baseRate = parseFloat(formData.baseRate);
      if (isNaN(baseRate) || baseRate < 0 || baseRate > 100) {
        errors.push('Tax rate must be between 0% and 100%');
      }
    }

    return errors;
  };

  const handleCreateTaxRule = async () => {
    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      const createdByEmployeeId = user?.id || '';
      
      if (!createdByEmployeeId) {
        setError('Unable to identify user. Please make sure you are logged in.');
        return;
      }

      setActionLoading(true);
      setError(null);

      const createdRuleIds: string[] = [];
      
      // Create simple tax rule (if no brackets or components)
      if (!hasBrackets && !hasComponents) {
        const apiData = {
          name: formData.name.trim(),
          description: formData.description || undefined,
          rate: parseFloat(formData.baseRate),
          createdByEmployeeId: createdByEmployeeId,
        };
        
        const response = await payrollConfigurationService.createTaxRule(apiData);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        if (response.data) {
          const responseData = response.data as any;
          if (responseData.message && responseData.message.includes('already exists')) {
            throw new Error(responseData.message);
          }
          else if (responseData.error) {
            throw new Error(responseData.error);
          }
          else if (responseData.statusCode && responseData.statusCode >= 400) {
            throw new Error(responseData.message || 'Failed to create tax rule');
          }
          createdRuleIds.push(responseData._id || responseData.id);
        }
      } else {
        // Create brackets
        if (hasBrackets) {
          for (const bracket of brackets) {
            const apiData = {
              name: `${formData.name.trim()} - Bracket ${bracket.bracketNumber}`,
              description: `${formData.description || ''}\nBracket Range: ${bracket.range}\nBracket Number: ${bracket.bracketNumber}`.trim(),
              rate: parseFloat(bracket.rate),
              createdByEmployeeId: createdByEmployeeId,
            };
            
            const response = await payrollConfigurationService.createTaxRule(apiData);
            
            if (response.error) {
              throw new Error(response.error);
            }
            
            if (response.data) {
              const responseData = response.data as any;
              if (responseData.message && responseData.message.includes('already exists')) {
                throw new Error(responseData.message);
              }
              else if (responseData.error) {
                throw new Error(responseData.error);
              }
              else if (responseData.statusCode && responseData.statusCode >= 400) {
                throw new Error(responseData.message || 'Failed to create tax rule');
              }
              createdRuleIds.push(responseData._id || responseData.id);
            }
          }
        }
        
        // Create components
        if (hasComponents) {
          for (const component of components) {
            const apiData = {
              name: `${formData.name.trim()} - ${component.name}`,
              description: `${formData.description || ''}\nComponent: ${component.name}`.trim(),
              rate: parseFloat(component.rate),
              createdByEmployeeId: createdByEmployeeId,
            };
            
            const response = await payrollConfigurationService.createTaxRule(apiData);
            
            if (response.error) {
              throw new Error(response.error);
            }
            
            if (response.data) {
              const responseData = response.data as any;
              if (responseData.message && responseData.message.includes('already exists')) {
                throw new Error(responseData.message);
              }
              else if (responseData.error) {
                throw new Error(responseData.error);
              }
              else if (responseData.statusCode && responseData.statusCode >= 400) {
                throw new Error(responseData.message || 'Failed to create tax rule');
              }
              createdRuleIds.push(responseData._id || responseData.id);
            }
          }
        }
      }
     
      setSuccess(`Successfully created ${createdRuleIds.length} tax rule(s)`);
      setShowCreateModal(false);
      resetForm();
      fetchTaxRules();
    } catch (err: any) {
      console.error('Create error details:', err);
     
      let errorMessage = 'Failed to create tax rule(s)';
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

  const handleEditGroupClick = (group: TaxRuleGroup) => {
    // Check if any rule in group can be edited (all must be draft)
    const hasNonDraft = group.rules.some(rule => rule.status !== 'draft');
    if (hasNonDraft) {
      setError('Only DRAFT tax rules can be edited. Approved or rejected rules cannot be modified.');
      return;
    }
    
    setSelectedGroupForEdit(group);
    
    // Extract base description from first rule
    const baseDescription = group.rules[0]?.description?.split('\n')[0] || '';
    
    // Check what type of rules exist in the group
    const bracketRules = group.rules.filter(rule => rule.name.includes('Bracket'));
    const componentRules = group.rules.filter(rule => 
      !rule.name.includes('Bracket') && rule.name.includes(' - ')
    );
    const simpleRule = group.rules.find(rule => 
      !rule.name.includes('Bracket') && !rule.name.includes(' - ')
    );
    
    // Set edit form data
    setEditFormData({
      description: baseDescription,
      baseRate: simpleRule ? simpleRule.rate.toString() : '',
    });
    
    // Parse bracket rules for editing
    const parsedBrackets: Bracket[] = bracketRules.map(rule => {
      const bracketMatch = rule.name.match(/Bracket\s+(\d+)/);
      const rangeMatch = rule.description?.match(/Bracket Range:\s*(.+)/);
      const rateMatch = rule.description?.match(/Bracket Number:\s*(\d+)/);
      
      return {
        id: parseInt(bracketMatch?.[1] || '0'),
        bracketNumber: parseInt(bracketMatch?.[1] || '0'),
        range: rangeMatch?.[1] || '',
        rate: rule.rate.toString(),
      };
    }).sort((a, b) => a.bracketNumber - b.bracketNumber);
    
    setEditBrackets(parsedBrackets);
    
    // Parse component rules for editing
    const parsedComponents: Component[] = componentRules.map(rule => {
      const componentName = rule.name.split(' - ')[1] || '';
      const isCustom = !componentTypes.includes(componentName);
      
      return {
        id: componentRules.indexOf(rule) + 1,
        name: componentName,
        custom: isCustom,
        rate: rule.rate.toString(),
      };
    });
    
    setEditComponents(parsedComponents);
    
    setShowEditModal(true);
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroupForEdit) return;
   
    try {
      setActionLoading(true);
      setError(null);

      const updatedRuleIds: string[] = [];
      const baseDescription = editFormData.description.trim();
      
      // Update bracket rules (rates only)
      for (const bracket of editBrackets) {
        const bracketRule = selectedGroupForEdit.rules.find(rule => 
          rule.name.includes(`Bracket ${bracket.bracketNumber}`)
        );
        
        if (bracketRule) {
          // Preserve the original bracket details from description
          const oldDescription = bracketRule.description || '';
          const bracketDetails = oldDescription.split('\n').slice(1).join('\n');
          const newDescription = baseDescription + (bracketDetails ? '\n' + bracketDetails : '');
          
          const updateData = {
            description: newDescription,
            rate: parseFloat(bracket.rate),
          };
          
          const response = await payrollConfigurationService.updateTaxRule(
            bracketRule._id,
            updateData
          );
          
          if (response.error) {
            throw new Error(response.error);
          }
          updatedRuleIds.push(bracketRule._id);
        }
      }
      
      // Update component rules (rates only)
      for (const component of editComponents) {
        const componentRule = selectedGroupForEdit.rules.find(rule => 
          rule.name.includes(` - ${component.name}`)
        );
        
        if (componentRule) {
          // Preserve the original component details from description
          const oldDescription = componentRule.description || '';
          const componentDetails = oldDescription.split('\n').slice(1).join('\n');
          const newDescription = baseDescription + (componentDetails ? '\n' + componentDetails : '');
          
          const updateData = {
            description: newDescription,
            rate: parseFloat(component.rate),
          };
          
          const response = await payrollConfigurationService.updateTaxRule(
            componentRule._id,
            updateData
          );
          
          if (response.error) {
            throw new Error(response.error);
          }
          updatedRuleIds.push(componentRule._id);
        }
      }
      
      // Update simple rule (if exists)
      const simpleRule = selectedGroupForEdit.rules.find(rule => 
        !rule.name.includes('Bracket') && !rule.name.includes(' - ')
      );
      
      if (simpleRule) {
        const updateData = {
          description: baseDescription || undefined,
          rate: parseFloat(editFormData.baseRate),
        };
        
        const response = await payrollConfigurationService.updateTaxRule(
          simpleRule._id,
          updateData
        );
        
        if (response.error) {
          throw new Error(response.error);
        }
        updatedRuleIds.push(simpleRule._id);
      }
     
      setSuccess(`Successfully updated ${updatedRuleIds.length} tax rule(s)`);
      setShowEditModal(false);
      setSelectedGroupForEdit(null);
      fetchTaxRules();
    } catch (err: any) {
      console.error('Update error details:', err);
     
      let errorMessage = 'Failed to update tax rule(s)';
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

  const handleViewClick = (taxRule: TaxRule) => {
    setSelectedTaxRule(taxRule);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      baseRate: '',
    });
    setBrackets([
      { id: 1, bracketNumber: 1, range: '0-50,000', rate: '0' },
      { id: 2, bracketNumber: 2, range: '50,001-100,000', rate: '10' },
      { id: 3, bracketNumber: 3, range: '100,001-150,000', rate: '15' },
    ]);
    setComponents([
      { id: 1, name: 'Income Tax', custom: false, rate: '5' },
      { id: 2, name: 'Excise Tax', custom: false, rate: '7' },
    ]);
    setHasBrackets(false);
    setHasComponents(false);
    setSelectedTaxRule(null);
    setError(null);
  };

  const resetEditForm = () => {
    setEditFormData({
      description: '',
      baseRate: '',
    });
    setEditBrackets([]);
    setEditComponents([]);
    setSelectedGroupForEdit(null);
    setError(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleEditBracketRateChange = (id: number, rate: string) => {
    setEditBrackets(prev => prev.map(bracket => 
      bracket.id === id ? { ...bracket, rate } : bracket
    ));
  };

  const handleEditComponentChange = (id: number, field: 'name' | 'rate', value: string) => {
    setEditComponents(prev => prev.map(component => 
      component.id === id ? { 
        ...component, 
        [field]: value,
        custom: field === 'name' ? !componentTypes.includes(value) : component.custom
      } : component
    ));
  };

  const handleBracketChange = (id: number, field: keyof Bracket, value: string) => {
    setBrackets(prev => prev.map(bracket => 
      bracket.id === id ? { ...bracket, [field]: value } : bracket
    ));
    
    // Auto-update subsequent brackets' ranges
    if (field === 'range' && id < brackets.length) {
      const updatedBrackets = [...brackets];
      const currentBracket = updatedBrackets.find(b => b.id === id);
      
      if (currentBracket && id < updatedBrackets.length) {
        const nextBracket = updatedBrackets[id];
        const upperMatch = value.match(/(\d+(?:,\d+)*)\+?$/);
        
        if (upperMatch && nextBracket) {
          const upperBound = parseInt(upperMatch[1].replace(/,/g, ''));
          const currentRange = nextBracket.range;
          const currentLowerMatch = currentRange.match(/^(\d+(?:,\d+)*)/);
          
          if (currentLowerMatch) {
            const newLower = (upperBound + 1).toLocaleString();
            const suffix = currentRange.substring(currentLowerMatch[0].length);
            const newRange = `${newLower}${suffix}`;
            setBrackets(prev => prev.map(b => 
              b.id === nextBracket.id ? { ...b, range: newRange } : b
            ));
          }
        }
      }
    }
  };

  const handleComponentChange = (id: number, field: keyof Component, value: string) => {
    setComponents(prev => prev.map(component => 
      component.id === id ? { 
        ...component, 
        [field]: field === 'name' ? value : value,
        custom: field === 'name' ? !componentTypes.includes(value) : component.custom
      } : component
    ));
  };

  const addBracket = () => {
    const lastBracket = brackets[brackets.length - 1];
    let newRange = '150,001-200,000';
    
    if (lastBracket) {
      const upperMatch = lastBracket.range.match(/(\d+(?:,\d+)*)\+?$/);
      if (upperMatch) {
        const upperBound = parseInt(upperMatch[1].replace(/,/g, ''));
        newRange = `${(upperBound + 1).toLocaleString()}-${(upperBound + 50000).toLocaleString()}`;
      }
    }
    
    setBrackets(prev => [
      ...prev,
      {
        id: prev.length + 1,
        bracketNumber: prev.length + 1,
        range: newRange,
        rate: '20'
      }
    ]);
    setHasBrackets(true);
  };

  const removeBracket = (id: number) => {
    if (brackets.length <= 1) {
      setHasBrackets(false);
    }
    const updatedBrackets = brackets.filter(b => b.id !== id)
      .map((b, index) => ({ ...b, bracketNumber: index + 1 }));
    setBrackets(updatedBrackets);
  };

  const addComponent = () => {
    setComponents(prev => [
      ...prev,
      {
        id: prev.length + 1,
        name: '',
        custom: true,
        rate: ''
      }
    ]);
    setHasComponents(true);
  };

  const removeComponent = (id: number) => {
    if (components.length <= 1) {
      setHasComponents(false);
    }
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  const toggleGroupExpansion = (baseName: string) => {
    setTaxRuleGroups(prev => prev.map(group => 
      group.baseName === baseName ? { ...group, expanded: !group.expanded } : group
    ));
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
      {error && !showCreateModal && !showEditModal && (
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


      {/* Tax Rules Groups */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Tax Rules ({taxRules.length})</h2>
            <div className="text-sm text-slate-600">
              {taxRuleGroups.length} Group(s)
            </div>
          </div>
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
          <div className="divide-y divide-slate-100">
            {taxRuleGroups.map((group) => (
              <div key={group.baseName} className="p-6">
                {/* Group Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-lg transition-colors"
                      onClick={() => toggleGroupExpansion(group.baseName)}
                    >
                      {group.expanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{group.baseName}</h3>
                        {group.description && (
                          <p className="text-slate-600 text-sm mt-1">{group.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                      {group.rules.length} rule(s)
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[group.rules[0]?.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[group.rules[0]?.status] || group.rules[0]?.status}
                    </span>
                    {group.rules.every(rule => rule.status === 'draft') && (
                      <button
                        onClick={() => handleEditGroupClick(group)}
                        className="flex items-center gap-2 px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors"
                        title="Edit Group"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Group
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Expanded Rules */}
                {group.expanded && (
                  <div className="mt-6 pl-8 border-l-2 border-slate-200 ml-3">
                    <div className="space-y-4">
                      {group.rules.map((taxRule) => {
                        const isBracket = taxRule.name.includes('Bracket');
                        const isComponent = !isBracket && taxRule.name.includes(' - ');
                        
                        return (
                          <div key={taxRule._id} className="bg-slate-50 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    isBracket ? 'bg-blue-100 text-blue-800' :
                                    isComponent ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {isBracket ? 'Bracket' : isComponent ? 'Component' : 'Simple'}
                                  </span>
                                  <div>
                                    <h4 className="font-medium text-slate-900">
                                      {isBracket 
                                        ? taxRule.name.replace(`${group.baseName} - `, '')
                                        : isComponent
                                        ? taxRule.name.replace(`${group.baseName} - `, '')
                                        : 'Base Rate'
                                      }
                                    </h4>
                                    {taxRule.description && taxRule.description.includes('\n') && (
                                      <div className="mt-1 space-y-1">
                                        {taxRule.description.split('\n').slice(1).map((line, idx) => (
                                          <p key={idx} className="text-xs text-slate-500">
                                            {line}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <span className="text-slate-700 font-medium text-lg">
                                  {formatPercentage(taxRule.rate)}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleViewClick(taxRule)}
                                    className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors"
                                    title="View Details"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Legal & Policy Admin Information - Tax Rules</h3>
        <ul className="text-blue-800 text-sm space-y-2">
          <li>• As a Legal & Policy Admin, you can <span className="font-semibold">create draft</span> tax rules</li>
          <li>• You can <span className="font-semibold">edit draft</span> tax rules only (not approved or rejected ones)</li>
          <li>• When editing a tax rule group, you can only modify rates and the base description</li>
          <li>• Bracket ranges and component names cannot be changed after creation</li>
          <li>• <span className="font-semibold">Business Rule BR 5:</span> 
            <span className="text-amber-600"> (Workaround Implemented) </span>
            Use "Add Bracket" to create progressive tax brackets
          </li>
          <li>• <span className="font-semibold">Business Rule BR 6:</span> 
            <span className="text-amber-600"> (Workaround Implemented) </span>
            Use "Add Component" to create multiple tax components
          </li>
          <li>• Tax rules define tax rates, exemptions, and thresholds for payroll calculations</li>
          <li>• <span className="font-semibold">Compliance:</span> Configurations must follow current tax legislation</li>
          <li>• <span className="font-semibold">Note:</span> Payroll Manager has approval authority for tax rule configurations</li>
        </ul>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  Create Tax Rule
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Show error only inside modal */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-red-600 mt-0.5">✕</div>
                    <div>
                      <p className="text-red-800 font-medium">Validation Error</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Base Tax Rule Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 text-lg">Tax Rule Information</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Rule Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., Tax Rule 1, Corporate Tax Rules 2024"
                    maxLength={100}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will be the base name for all related tax rules
                  </p>
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
                    rows={2}
                    placeholder="Enter description, legal references, or notes..."
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Simple Tax Rate (only if no brackets or components) */}
              {!hasBrackets && !hasComponents && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Rate (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="baseRate"
                      value={formData.baseRate}
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
                  <p className="text-xs text-slate-500 mt-1">
                    Single tax rate for this rule (will be disabled if you add brackets or components)
                  </p>
                </div>
              )}

              {/* Brackets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 text-lg">Progressive Tax Brackets</h4>
                  <button
                    type="button"
                    onClick={addBracket}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Bracket
                  </button>
                </div>
                
                {hasBrackets ? (
                  <div className="space-y-3">
                    {brackets.map((bracket, index) => (
                      <div key={bracket.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-900">Bracket {bracket.bracketNumber}</span>
                          {brackets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBracket(bracket.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove bracket"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Income Range *
                            </label>
                            <input
                              type="text"
                              value={bracket.range}
                              onChange={(e) => handleBracketChange(bracket.id, 'range', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="e.g., 0-50,000 or 100,001+"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Tax Rate (%) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={bracket.rate}
                                onChange={(e) => handleBracketChange(bracket.id, 'rate', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="e.g., 10"
                                step="0.01"
                                min="0"
                                max="100"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-slate-500 text-sm">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                    <p className="text-slate-600 text-sm">No brackets added. Click "Add Bracket" to create progressive tax rates.</p>
                  </div>
                )}
              </div>

              {/* Components Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 text-lg">Tax Components</h4>
                  <button
                    type="button"
                    onClick={addComponent}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Component
                  </button>
                </div>
                
                {hasComponents ? (
                  <div className="space-y-3">
                    {components.map((component) => (
                      <div key={component.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-900">Component</span>
                          {components.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeComponent(component.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove component"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Component Name *
                            </label>
                            {component.custom ? (
                              <input
                                type="text"
                                value={component.name}
                                onChange={(e) => handleComponentChange(component.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Enter custom component name"
                              />
                            ) : (
                              <select
                                value={component.name}
                                onChange={(e) => handleComponentChange(component.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">Select component type</option>
                                {componentTypes.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                                <option value="custom">Custom Component</option>
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Tax Rate (%) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={component.rate}
                                onChange={(e) => handleComponentChange(component.id, 'rate', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="e.g., 5"
                                step="0.01"
                                min="0"
                                max="100"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-slate-500 text-sm">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {component.custom && (
                          <p className="text-xs text-amber-600 mt-2">
                            This is a custom component. The name can be edited.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                    <p className="text-slate-600 text-sm">No components added. Click "Add Component" to add multiple tax types.</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 mb-2">What will be created:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <span className="font-semibold">Base Rule:</span> {formData.name || '[No name]'}</li>
                  {hasBrackets && (
                    <li>• <span className="font-semibold">Brackets:</span> {brackets.length} progressive tax bracket(s)</li>
                  )}
                  {hasComponents && (
                    <li>• <span className="font-semibold">Components:</span> {components.length} tax component(s)</li>
                  )}
                  {!hasBrackets && !hasComponents && (
                    <li>• <span className="font-semibold">Single Rate:</span> {formData.baseRate || '0'}%</li>
                  )}
                  <li>• <span className="font-semibold">Total Rules:</span> {(
                    (hasBrackets ? brackets.length : 0) + 
                    (hasComponents ? components.length : 0) + 
                    (!hasBrackets && !hasComponents ? 1 : 0)
                  )} individual tax rule(s) will be created</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTaxRule}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : `Create ${(
                  (hasBrackets ? brackets.length : 0) + 
                  (hasComponents ? components.length : 0) + 
                  (!hasBrackets && !hasComponents ? 1 : 0)
                )} Rule(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedGroupForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  Edit Tax Rule Group: {selectedGroupForEdit.baseName}
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetEditForm();
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Show error only inside modal */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-red-600 mt-0.5">✕</div>
                    <div>
                      <p className="text-red-800 font-medium">Validation Error</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Base Tax Rule Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 text-lg">Base Description</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Edit base description, legal references, or notes..."
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {editFormData.description.length}/500 characters
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Note: This will update the base description for all rules in this group while preserving bracket/component details.
                  </p>
                </div>

                {/* Simple Rate (if no brackets or components) */}
                {editBrackets.length === 0 && editComponents.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tax Rate (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="baseRate"
                        value={editFormData.baseRate}
                        onChange={handleEditChange}
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
                  </div>
                )}
              </div>

              {/* Edit Brackets Section */}
              {editBrackets.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 text-lg">Edit Bracket Rates</h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">⚠️ Editing Restrictions</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• Bracket ranges cannot be changed after creation</li>
                      <li>• Only tax rates can be modified</li>
                      <li>• To change ranges, delete and recreate the tax rule group</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    {editBrackets.map((bracket) => (
                      <div key={bracket.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="mb-3">
                          <span className="font-medium text-slate-900">Bracket {bracket.bracketNumber}</span>
                          <p className="text-xs text-slate-500 mt-1">Range: {bracket.range}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Tax Rate (%) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={bracket.rate}
                              onChange={(e) => handleEditBracketRateChange(bracket.id, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="e.g., 10"
                              step="0.01"
                              min="0"
                              max="100"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-slate-500 text-sm">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Components Section */}
              {editComponents.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 text-lg">Edit Component Rates</h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">⚠️ Editing Restrictions</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• Component names cannot be changed after creation</li>
                      <li>• Only tax rates can be modified</li>
                      <li>• To change component names, delete and recreate the tax rule group</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    {editComponents.map((component) => (
                      <div key={component.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="mb-3">
                          <span className="font-medium text-slate-900">{component.name}</span>
                          <p className="text-xs text-slate-500 mt-1">
                            {component.custom ? 'Custom Component' : 'Standard Component'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Tax Rate (%) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={component.rate}
                              onChange={(e) => handleEditComponentChange(component.id, 'rate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="e.g., 5"
                              step="0.01"
                              min="0"
                              max="100"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-slate-500 text-sm">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 mb-2">What will be updated:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <span className="font-semibold">Base Description:</span> Updated for all {selectedGroupForEdit.rules.length} rule(s)</li>
                  {editBrackets.length > 0 && (
                    <li>• <span className="font-semibold">Bracket Rates:</span> {editBrackets.length} bracket(s) will be updated</li>
                  )}
                  {editComponents.length > 0 && (
                    <li>• <span className="font-semibold">Component Rates:</span> {editComponents.length} component(s) will be updated</li>
                  )}
                  {editBrackets.length === 0 && editComponents.length === 0 && (
                    <li>• <span className="font-semibold">Base Rate:</span> Updated to {editFormData.baseRate || '0'}%</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetEditForm();
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : `Update ${selectedGroupForEdit.rules.length} Rule(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTaxRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Tax Rule Details</h3>
                  <div className="text-slate-600 text-sm">
                    ID: {selectedTaxRule._id.substring(0, 8)}...
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{selectedTaxRule.name}</h4>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedTaxRule.status] || 'bg-gray-100 text-gray-800'}`}>
                  {statusLabels[selectedTaxRule.status] || selectedTaxRule.status}
                </span>
              </div>
             
              <div>
                <p className="text-sm text-slate-500 mb-1">Tax Rate</p>
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
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Created By</p>
                    <p className="font-medium text-slate-900 truncate" title={selectedTaxRule.createdBy}>
                      {selectedTaxRule.createdBy}
                    </p>
                  </div>
                )}
              </div>
             
              {selectedTaxRule.approvedBy && (
                <div className={`${selectedTaxRule.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mt-4`}>
                  <div className="space-y-4">
                    <div>
                      <p className={`text-sm ${selectedTaxRule.status === 'rejected' ? 'text-red-600' : 'text-green-600'} mb-1`}>
                        {selectedTaxRule.status === 'rejected' ? 'Rejected By' : 'Approved By'}
                      </p>
                      <p className={`font-medium ${selectedTaxRule.status === 'rejected' ? 'text-red-800' : 'text-green-800'} truncate`} 
                         title={selectedTaxRule.approvedBy}>
                        {selectedTaxRule.approvedBy}
                      </p>
                    </div>
                    {selectedTaxRule.approvedAt && (
                      <div>
                        <p className={`text-sm ${selectedTaxRule.status === 'rejected' ? 'text-red-600' : 'text-green-600'} mb-1`}>
                          {selectedTaxRule.status === 'rejected' ? 'Rejected At' : 'Approved At'}
                        </p>
                        <p className={`font-medium ${selectedTaxRule.status === 'rejected' ? 'text-red-800' : 'text-green-800'}`}>
                          {formatDate(selectedTaxRule.approvedAt)}
                        </p>
                      </div>
                    )}
                  </div>
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