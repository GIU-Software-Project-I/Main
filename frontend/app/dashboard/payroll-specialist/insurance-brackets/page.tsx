'use client';

import { SetStateAction, useEffect, useMemo, useState } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  Eye,
  Filter,
  HelpCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  Users,
  ChevronRight,
  XCircle,
  Building,
  Calendar,
  FileText,
  Settings,
  Shield as ShieldIcon,
  Percent,
  Calculator,
  TrendingUp,
  Activity,
  Heart,
  BriefcaseMedical,
  Umbrella,
  User,
  Building2,
  LineChart
} from "lucide-react";

// Status enum
enum ConfigStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

interface InsuranceBracket {
  id: string;
  name: string;
  status: ConfigStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  __v?: number;
}

type ContributionCalculation = {
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  isValid: boolean;
};

// Insurance types with icons
const insuranceTypeOptions = [
  { value: 'Health Insurance', label: 'Health Insurance', icon: Heart },
  { value: 'Social Insurance', label: 'Social Insurance', icon: ShieldIcon },
  { value: 'Pension Fund', label: 'Pension Fund', icon: Building2 },
  { value: 'Unemployment Insurance', label: 'Unemployment Insurance', icon: Umbrella },
  { value: 'Disability Insurance', label: 'Disability Insurance', icon: User },
  { value: 'Life Insurance', label: 'Life Insurance', icon: BriefcaseMedical },
  { value: 'custom', label: 'Custom Insurance Type', icon: FileText },
];

// Form types
type CreateForm = {
  name: string;
  customName: string;
  minSalary: string;
  maxSalary: string;
  employeeRate: string;
  employerRate: string;
};

type EditState = {
  id: string;
  name: string;
  customName: string;
  minSalary: string;
  maxSalary: string;
  employeeRate: string;
  employerRate: string;
} | null;

type CalculationForm = {
  salary: string;
};

export default function InsuranceBracketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<CreateForm>({ 
    name: "", 
    customName: "", 
    minSalary: "", 
    maxSalary: "", 
    employeeRate: "", 
    employerRate: "" 
  });
  const [calculationForm, setCalculationForm] = useState<CalculationForm>({ salary: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<InsuranceBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [filter, setFilter] = useState<"all" | ConfigStatus>("all");
  const [insuranceTypeFilter, setInsuranceTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<InsuranceBracket | null>(null);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<InsuranceBracket | null>(null);
  const [calculationResult, setCalculationResult] = useState<ContributionCalculation | null>(null);
  const [calculationLoading, setCalculationLoading] = useState(false);

  function normalize(raw: any): InsuranceBracket {
    return {
      id: raw.id ?? raw._id ?? String(Math.random()),
      name: raw.name ?? "",
      status: raw.status ?? ConfigStatus.DRAFT,
      createdBy: raw.createdBy ?? raw.createdByEmployeeId ?? undefined,
      createdAt: raw.createdAt ?? raw.created_at ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
      approvedBy: raw.approvedBy ?? undefined,
      approvedAt: raw.approvedAt ?? raw.approved_at ?? undefined,
      minSalary: Number(raw.minSalary ?? raw.min_salary ?? 0),
      maxSalary: Number(raw.maxSalary ?? raw.max_salary ?? 0),
      employeeRate: Number(raw.employeeRate ?? raw.employee_rate ?? 0),
      employerRate: Number(raw.employerRate ?? raw.employer_rate ?? 0),
      __v: raw.__v ?? undefined,
    } as InsuranceBracket;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollConfigurationService.getInsuranceBrackets();
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      const data = (res as any)?.data;
      const candidates = [
        data?.data,
        data,
        res,
      ];

      const list = candidates.find(Array.isArray) || [];
      setItems(list.map(normalize));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load insurance brackets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    
    if (filter !== "all") {
      result = result.filter((i) => i.status === filter);
    }
    
    if (insuranceTypeFilter !== "all") {
      result = result.filter((i) => i.name === insuranceTypeFilter);
    }
    
    if (searchTerm) {
      result = result.filter((bracket) => {
        const searchText = [
          bracket.name,
          bracket.createdBy,
          bracket.approvedBy,
          bracket.id
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [items, filter, insuranceTypeFilter, searchTerm]);

  const validateForm = (isEdit: boolean = false) => {
    const errors: string[] = [];

    // Determine the final name
    const finalName = form.name === 'custom' ? form.customName : form.name;

    // Only validate name for new creation (not for editing)
    if (!isEdit) {
      if (!form.name) {
        errors.push('Please select an insurance type');
      } else if (form.name === 'custom' && !form.customName.trim()) {
        errors.push('Custom insurance name is required');
      }

      // Check for duplicate name only when creating new
      if (finalName) {
        const isDuplicate = items.some(bracket => 
          bracket.name.toLowerCase() === finalName.toLowerCase()
        );
        if (isDuplicate) {
          errors.push(`Insurance name "${finalName}" already exists. Please use a different name.`);
        }
      }
    }

    // Required numeric fields
    if (!form.minSalary) errors.push('Minimum salary is required');
    if (!form.maxSalary) errors.push('Maximum salary is required');
    if (!form.employeeRate) errors.push('Employee rate is required');
    if (!form.employerRate) errors.push('Employer rate is required');

    // Numeric validation
    const minSalary = parseFloat(form.minSalary);
    const maxSalary = parseFloat(form.maxSalary);
    const employeeRate = parseFloat(form.employeeRate);
    const employerRate = parseFloat(form.employerRate);

    if (isNaN(minSalary) || minSalary < 0) errors.push('Minimum salary must be a positive number');
    if (isNaN(maxSalary) || maxSalary < 0) errors.push('Maximum salary must be a positive number');
    if (isNaN(employeeRate) || employeeRate < 0 || employeeRate > 100) errors.push('Employee rate must be between 0 and 100');
    if (isNaN(employerRate) || employerRate < 0 || employerRate > 100) errors.push('Employer rate must be between 0 and 100');

    // Logical validation
    if (minSalary >= maxSalary) errors.push('Maximum salary must be greater than minimum salary');
    if (employeeRate + employerRate > 100) errors.push('Total contribution rate (employee + employer) cannot exceed 100%');

    return errors;
  };

  async function create() {
    const validationErrors = validateForm(false);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    if (!user?.id) {
      setError(`User not authenticated. Please log in again.`);
      return;
    }
    
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const finalName = form.name === 'custom' ? form.customName : form.name;
      
      const payload = {
        name: finalName,
        minSalary: parseFloat(form.minSalary),
        maxSalary: parseFloat(form.maxSalary),
        employeeRate: parseFloat(form.employeeRate),
        employerRate: parseFloat(form.employerRate),
        createdByEmployeeId: user.id,
      };
      
      const res = await payrollConfigurationService.createInsuranceBracket(payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Insurance bracket created successfully as DRAFT");
      setForm({ 
        name: "", 
        customName: "", 
        minSalary: "", 
        maxSalary: "", 
        employeeRate: "", 
        employerRate: "" 
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create insurance bracket");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(bracket: InsuranceBracket) {
    if (bracket.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT insurance brackets can be edited");
      return;
    }
    
    setEdit({ 
      id: bracket.id, 
      name: bracket.name,
      customName: bracket.name,
      minSalary: String(bracket.minSalary ?? 0), 
      maxSalary: String(bracket.maxSalary ?? 0), 
      employeeRate: String(bracket.employeeRate ?? 0), 
      employerRate: String(bracket.employerRate ?? 0)
    });
  }

  async function saveEdit() {
    if (!edit) return;
    
    const validationErrors = validateForm(true);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      const payload = {
        minSalary: parseFloat(edit.minSalary),
        maxSalary: parseFloat(edit.maxSalary),
        employeeRate: parseFloat(edit.employeeRate),
        employerRate: parseFloat(edit.employerRate),
      };
      
      const res = await payrollConfigurationService.updateInsuranceBracket(edit.id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Insurance bracket updated successfully");
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save changes");
    }
  }

  function cancelEdit() {
    setEdit(null);
  }

    async function calculateContributions() {
    if (!selectedBracket) return;

    try {
      const salary = parseFloat(calculationForm.salary);
      if (isNaN(salary) || salary < 0) {
        setError('Please enter a valid positive salary amount');
        setCalculationResult(null);
        return;
      }

      setCalculationLoading(true);
      setCalculationResult(null);
      setError(null);

      const response = await payrollConfigurationService.calculateContributions(
        selectedBracket.id,
        salary
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const result = response.data as ContributionCalculation;
        setCalculationResult(result);

        if (!result.isValid) {
          setError(
            `Salary does not fall within this insurance bracket range (${formatCurrency(selectedBracket.minSalary)} - ${formatCurrency(selectedBracket.maxSalary)})`
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate contributions');
      setCalculationResult(null);
    } finally {
      setCalculationLoading(false);
    }
  }
  
  function formatCurrency(amount: number) {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }
  
  function formatDate(dateStr?: string) {
    if (!dateStr) return 'Not available';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function formatPercentage(rate: number) {
    return `${rate.toFixed(2)}%`;
  }
  
  function getStatusBadge(status: ConfigStatus) {
    switch (status) {
      case ConfigStatus.APPROVED:
        return (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case ConfigStatus.REJECTED:
        return (
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case ConfigStatus.DRAFT:
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            <Edit className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getInsuranceIcon(name: string) {
    const insuranceType = insuranceTypeOptions.find(type => 
      name.toLowerCase().includes(type.label.toLowerCase().split(' ')[0])
    );
    return insuranceType?.icon || ShieldIcon;
  }

  function getInsuranceColor(name: string) {
    if (name.includes('Health')) return 'bg-red-100 text-red-700';
    if (name.includes('Social')) return 'bg-blue-100 text-blue-700';
    if (name.includes('Pension')) return 'bg-green-100 text-green-700';
    if (name.includes('Unemployment')) return 'bg-purple-100 text-purple-700';
    if (name.includes('Disability')) return 'bg-orange-100 text-orange-700';
    if (name.includes('Life')) return 'bg-indigo-100 text-indigo-700';
    return 'bg-gray-100 text-gray-700';
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-6 relative">
      {/* Theme Customizer Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <ThemeCustomizerTrigger 
          onClick={() => setShowThemeCustomizer(true)}
        />
      </div>
      
      {/* Theme Customizer Modal */}
      {showThemeCustomizer && (
        <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="hover:text-primary transition-colors">Payroll Configuration</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Insurance Brackets</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Insurance Brackets
              </h1>
              <p className="text-muted-foreground">
                Define insurance brackets with salary ranges and contribution percentages for automatic payroll deductions
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-success font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {!user && !authLoading && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-warning">Debug: User object is null. Check localStorage for 'hr_user' key.</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Create New Insurance Bracket
              </CardTitle>
              <CardDescription>
                Define a new insurance bracket. Drafts require HR Manager approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Insurance Type *</Label>
                  <Select
                    value={form.name}
                    onValueChange={(value) => setForm((f) => ({ ...f, name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select insurance type" />
                    </SelectTrigger>
                    <SelectContent>
                      {insuranceTypeOptions.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a predefined insurance type or choose "Custom Insurance Type"
                  </p>
                </div>

                {form.name === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="customName">Custom Insurance Name *</Label>
                    <Input
                      id="customName"
                      placeholder="e.g., Vision Insurance, Dental Insurance"
                      value={form.customName}
                      onChange={(e) => setForm((f) => ({ ...f, customName: e.target.value }))}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minSalary">Minimum Salary *</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        id="minSalary"
                        type="number"
                        placeholder="0"
                        value={form.minSalary}
                        onChange={(e) => setForm((f) => ({ ...f, minSalary: e.target.value }))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxSalary">Maximum Salary *</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        id="maxSalary"
                        type="number"
                        placeholder="10000"
                        value={form.maxSalary}
                        onChange={(e) => setForm((f) => ({ ...f, maxSalary: e.target.value }))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeRate">Employee Rate (%) *</Label>
                    <div className="relative">
                      <Input
                        id="employeeRate"
                        type="number"
                        placeholder="5"
                        value={form.employeeRate}
                        onChange={(e) => setForm((f) => ({ ...f, employeeRate: e.target.value }))}
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employerRate">Employer Rate (%) *</Label>
                    <div className="relative">
                      <Input
                        id="employerRate"
                        type="number"
                        placeholder="10"
                        value={form.employerRate}
                        onChange={(e) => setForm((f) => ({ ...f, employerRate: e.target.value }))}
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Guidelines</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Maximum salary must be greater than minimum salary</li>
                    <li>Contribution rates must be between 0% and 100%</li>
                    <li>Total contribution rate (employee + employer) cannot exceed 100%</li>
                    <li>Insurance name must be unique - duplicates are not allowed</li>
                    <li>Insurance type/name cannot be changed after creation</li>
                    <li>All brackets start in DRAFT status and require HR Manager approval</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={create} 
                disabled={creating || !form.name || !form.minSalary || !form.maxSalary || !form.employeeRate || !form.employerRate}
                className="w-full"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Insurance Bracket Draft
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Information Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5" />
                Insurance Types
              </CardTitle>
              <CardDescription>
                Common insurance categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insuranceTypeOptions.filter(opt => opt.value !== 'custom').map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.value} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className={`p-2 rounded-lg ${getInsuranceColor(type.label)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">{type.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {type.value === 'Health Insurance' && 'Medical coverage and healthcare'}
                          {type.value === 'Social Insurance' && 'Social security and benefits'}
                          {type.value === 'Pension Fund' && 'Retirement and pension plans'}
                          {type.value === 'Unemployment Insurance' && 'Job loss protection'}
                          {type.value === 'Disability Insurance' && 'Disability coverage'}
                          {type.value === 'Life Insurance' && 'Life coverage and benefits'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Only draft brackets can be edited</p>
                <p>• Approved brackets require new draft for changes</p>
                <p>• HR Manager approval required for activation</p>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Insurance Brackets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5" />
              All Insurance Brackets
            </CardTitle>
            <CardDescription>
              Manage existing insurance brackets across all statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search insurance brackets..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={insuranceTypeFilter} onValueChange={setInsuranceTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Insurance type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {insuranceTypeOptions.filter(opt => opt.value !== 'custom').map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value={ConfigStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={ConfigStatus.APPROVED}>Approved</SelectItem>
                    <SelectItem value={ConfigStatus.REJECTED}>Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={load}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                      <ShieldIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {searchTerm || filter !== "all" || insuranceTypeFilter !== "all" ? "No matching brackets" : "No insurance brackets yet"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filter !== "all" || insuranceTypeFilter !== "all" ? "Try adjusting your search or filter" : "Create your first insurance bracket using the form above"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insurance Type</TableHead>
                      <TableHead>Salary Range</TableHead>
                      <TableHead>Contributions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((bracket) => {
                      const Icon = getInsuranceIcon(bracket.name);
                      return (
                        <TableRow key={bracket.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${getInsuranceColor(bracket.name)}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="font-medium text-foreground">
                                {bracket.name}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {edit?.id === bracket.id ? (
                              <div className="space-y-2">
                                <Input
                                  type="number"
                                  value={edit.minSalary}
                                  onChange={(e) => setEdit((s) => (s ? { ...s, minSalary: e.target.value } : s))}
                                  placeholder="Min"
                                  className="w-full"
                                />
                                <Input
                                  type="number"
                                  value={edit.maxSalary}
                                  onChange={(e) => setEdit((s) => (s ? { ...s, maxSalary: e.target.value } : s))}
                                  placeholder="Max"
                                  className="w-full"
                                />
                              </div>
                            ) : (
                              <div className="text-sm">
                                <div className="font-medium text-foreground">
                                  {formatCurrency(bracket.minSalary)} - {formatCurrency(bracket.maxSalary)}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {edit?.id === bracket.id ? (
                              <div className="space-y-2">
                                <Input
                                  type="number"
                                  value={edit.employeeRate}
                                  onChange={(e) => setEdit((s) => (s ? { ...s, employeeRate: e.target.value } : s))}
                                  placeholder="Employee %"
                                  className="w-full"
                                />
                                <Input
                                  type="number"
                                  value={edit.employerRate}
                                  onChange={(e) => setEdit((s) => (s ? { ...s, employerRate: e.target.value } : s))}
                                  placeholder="Employer %"
                                  className="w-full"
                                />
                              </div>
                            ) : (
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span>Employee: {formatPercentage(bracket.employeeRate)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Building className="h-3 w-3 text-muted-foreground" />
                                  <span>Employer: {formatPercentage(bracket.employerRate)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Total: {formatPercentage(bracket.employeeRate + bracket.employerRate)}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(bracket.status)}
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(bracket.createdAt)}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {edit?.id === bracket.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={saveEdit}
                                    className="h-8"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEdit}
                                    className="h-8"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setView(bracket)}
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {bracket.status === ConfigStatus.DRAFT && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => beginEdit(bracket)}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedBracket(bracket);
                                      setCalculationForm({ salary: "" });
                                      setCalculationResult(null);
                                      setError(null);
                                      setShowCalculateModal(true);
                                    }}
                                    title="Calculate contributions"
                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                  >
                                    <Calculator className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShieldIcon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {items.length} total
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">All Brackets</h3>
              <p className="text-xs text-muted-foreground mt-1">Total insurance bracket configurations</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Edit className="h-5 w-5 text-amber-600" />
                </div>
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                  {items.filter(i => i.status === ConfigStatus.DRAFT).length} pending
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">Drafts</h3>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                  {items.filter(i => i.status === ConfigStatus.APPROVED).length} active
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">Approved</h3>
              <p className="text-xs text-muted-foreground mt-1">Ready for calculation</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                  {items.filter(i => i.status === ConfigStatus.REJECTED).length} rejected
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">Rejected</h3>
              <p className="text-xs text-muted-foreground mt-1">Needs revision</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Insurance Bracket Details
            </DialogTitle>
            <DialogDescription>
              View complete information about this insurance bracket configuration
            </DialogDescription>
          </DialogHeader>
          
          {view && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getInsuranceColor(view.name)}`}>
                    {(() => {
                      const Icon = getInsuranceIcon(view.name);
                      return <Icon className="h-6 w-6" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{view.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {view.id}</p>
                  </div>
                </div>
                {getStatusBadge(view.status)}
              </div>

              {/* Salary Range */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Salary Range
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Minimum Salary</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="text-xl font-bold text-foreground">{formatCurrency(view.minSalary)}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Maximum Salary</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="text-xl font-bold text-foreground">{formatCurrency(view.maxSalary)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contribution Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Employee Rate</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-xl font-bold text-foreground">{formatPercentage(view.employeeRate)}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Employer Rate</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4 text-green-600" />
                          <span className="text-xl font-bold text-foreground">{formatPercentage(view.employerRate)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Total Contribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Contribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground">
                        {formatPercentage(view.employeeRate + view.employerRate)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Combined contribution rate for this insurance bracket
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Metadata</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Created By</Label>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{view.createdBy || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Approved By</Label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{view.approvedBy || 'Not approved'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Created Date</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(view.createdAt)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Last Updated</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(view.updatedAt) || 'Never'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setView(null)}>
              Close
            </Button>
            {view?.status === ConfigStatus.DRAFT && (
              <Button onClick={() => {
                beginEdit(view);
                setView(null);
              }}>
                Edit Insurance Bracket
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculate Modal */}
      <Dialog open={showCalculateModal} onOpenChange={setShowCalculateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculate Contributions
            </DialogTitle>
            <DialogDescription>
              Calculate insurance contributions based on employee salary
            </DialogDescription>
          </DialogHeader>
          
          {selectedBracket && (
            <div className="space-y-6">
              {/* Bracket Info */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Insurance Type</p>
                    <p className="text-lg font-bold text-foreground">{selectedBracket.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">Salary Range</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(selectedBracket.minSalary)} - {formatCurrency(selectedBracket.maxSalary)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Salary Input */}
              <div className="space-y-2">
                <Label htmlFor="salary">Employee Salary *</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="5000"
                    value={calculationForm.salary}
                    onChange={(e) => setCalculationForm(f => ({ ...f, salary: e.target.value }))}
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the employee's gross salary to calculate insurance contributions
                </p>
              </div>

              {/* Rate Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-blue-700">Employee Rate</Label>
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-2">{formatPercentage(selectedBracket.employeeRate)}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-green-700">Employer Rate</Label>
                    <Building className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-2">{formatPercentage(selectedBracket.employerRate)}</p>
                </div>
              </div>

              {/* Calculation Result */}
              {calculationResult && (
                <div className={`border rounded-lg p-4 ${calculationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h4 className="font-semibold text-foreground mb-3">Calculation Results</h4>
                  
                  {calculationResult.isValid ? (
                    <>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Employee Contribution</Label>
                            <p className="text-xl font-bold text-blue-700 mt-1">
                              {formatCurrency(calculationResult.employeeContribution)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Employer Contribution</Label>
                            <p className="text-xl font-bold text-green-700 mt-1">
                              {formatCurrency(calculationResult.employerContribution)}
                            </p>
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <Label className="text-sm text-muted-foreground">Total Contribution</Label>
                          <p className="text-2xl font-bold text-foreground mt-1">
                            {formatCurrency(calculationResult.totalContribution)}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
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
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCalculateModal(false);
              setCalculationResult(null);
              setCalculationForm({ salary: "" });
            }}>
              Close
            </Button>
            <Button 
              onClick={calculateContributions} 
              disabled={calculationLoading || !calculationForm.salary}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {calculationLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}