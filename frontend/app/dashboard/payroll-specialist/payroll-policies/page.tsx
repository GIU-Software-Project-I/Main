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
  BookOpen,
  Scale,
  Target,
  AlertTriangle,
  Coffee,
  Percent,
  Hash,
  CalendarDays,
  Users as UsersIcon,
  FileCheck,
  FileX
} from "lucide-react";

// Status enum
enum ConfigStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_APPROVAL = 'pending_approval'
}

interface PayrollPolicy {
  id: string;
  policyType: string;
  policyName: string;
  description: string;
  effectiveDate: string;
  expirationDate?: string;
  status: ConfigStatus;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  applicability?: string;
  ruleDefinition?: {
    percentage: number;
    fixedAmount: number;
    thresholdAmount: number;
    condition?: string;
  };
  __v?: number;
}

// Policy types with icons
const policyTypes = [
  { value: 'Deduction', label: 'Deduction', icon: MinusCircle },
  { value: 'Allowance', label: 'Allowance', icon: Gift },
  { value: 'Benefit', label: 'Benefit', icon: Heart },
  { value: 'Misconduct', label: 'Misconduct', icon: AlertTriangle },
  { value: 'Leave', label: 'Leave', icon: Coffee },
];

// Applicability options
const applicabilityOptions = [
  { value: 'All Employees', label: 'All Employees' },
  { value: 'Full Time Employees', label: 'Full Time Employees' },
  { value: 'Part Time Employees', label: 'Part Time Employees' },
  { value: 'Contractors', label: 'Contractors' },
  { value: 'Management', label: 'Management' },
  { value: 'Non-Management', label: 'Non-Management' },
];

// Icons for policy types (already imported above)
import { 
  MinusCircle, 
  Gift, 
  Heart,
  TrendingUp,
  Award,
  UserCheck,
  Building2,
  BriefcaseBusiness
} from 'lucide-react';

// Form types
type CreateForm = {
  policyType: string;
  policyName: string;
  description: string;
  effectiveDate: string;
  expirationDate: string;
  applicability: string;
  createdByEmployeeId: string;
};

type RuleDefinitionForm = {
  percentage: string;
  fixedAmount: string;
  thresholdAmount: string;
  condition: string;
};

type EditState = {
  id: string;
  policyType: string;
  policyName: string;
  description: string;
  effectiveDate: string;
  expirationDate: string;
  applicability: string;
  ruleDefinition: RuleDefinitionForm;
} | null;

export default function PayrollPoliciesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<CreateForm>({ 
    policyType: "", 
    policyName: "", 
    description: "", 
    effectiveDate: "", 
    expirationDate: "", 
    applicability: "", 
    createdByEmployeeId: "" 
  });
  const [ruleDefinition, setRuleDefinition] = useState<RuleDefinitionForm>({
    percentage: "",
    fixedAmount: "",
    thresholdAmount: "",
    condition: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<PayrollPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [filter, setFilter] = useState<"all" | ConfigStatus>("all");
  const [policyTypeFilter, setPolicyTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<PayrollPolicy | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  function normalize(raw: any): PayrollPolicy {
    return {
      id: raw.id ?? raw._id ?? String(Math.random()),
      policyType: raw.policyType ?? "",
      policyName: raw.policyName ?? "",
      description: raw.description ?? "",
      effectiveDate: raw.effectiveDate ?? raw.effective_date ?? "",
      expirationDate: raw.expirationDate ?? raw.expiration_date ?? undefined,
      status: raw.status ?? ConfigStatus.DRAFT,
      createdBy: raw.createdBy ?? raw.createdByEmployeeId ?? "",
      createdAt: raw.createdAt ?? raw.created_at ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
      approvedBy: raw.approvedBy ?? undefined,
      approvedAt: raw.approvedAt ?? raw.approved_at ?? undefined,
      rejectionReason: raw.rejectionReason ?? undefined,
      applicability: raw.applicability ?? undefined,
      ruleDefinition: raw.ruleDefinition ?? undefined,
      __v: raw.__v ?? undefined,
    } as PayrollPolicy;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollConfigurationService.getPayrollPolicies();
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
      setError(e?.message ?? "Failed to load payroll policies");
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
    
    if (policyTypeFilter !== "all") {
      result = result.filter((i) => i.policyType === policyTypeFilter);
    }
    
    if (searchTerm) {
      result = result.filter((policy) => {
        const searchText = [
          policy.policyName,
          policy.description,
          policy.createdBy,
          policy.approvedBy,
          policy.policyType,
          policy.applicability,
          policy.id
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [items, filter, policyTypeFilter, searchTerm]);

  async function create() {
    if (!form.policyType || !form.policyName || !form.description || 
        !form.effectiveDate || !form.applicability) {
      setError("Please fill in all required fields");
      return;
    }
    
    if (!user?.id) {
      setError(`User not authenticated. Please log in again.`);
      return;
    }
    
    // Validate that at least one rule definition field is filled
    if (!ruleDefinition.percentage && !ruleDefinition.fixedAmount && !ruleDefinition.thresholdAmount) {
      setError('Please fill at least one rule definition field (percentage, fixed amount, or threshold)');
      return;
    }

    // Validate individual fields
    const percentageNum = ruleDefinition.percentage ? parseFloat(ruleDefinition.percentage) : 0;
    const fixedAmountNum = ruleDefinition.fixedAmount ? parseFloat(ruleDefinition.fixedAmount) : 0;
    const thresholdNum = ruleDefinition.thresholdAmount ? parseFloat(ruleDefinition.thresholdAmount) : 0;

    if (ruleDefinition.percentage && (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100)) {
      setError('Percentage must be between 0 and 100');
      return;
    }
    
    if (ruleDefinition.fixedAmount && (isNaN(fixedAmountNum) || fixedAmountNum < 0)) {
      setError('Fixed amount must be 0 or greater');
      return;
    }
    
    if (ruleDefinition.thresholdAmount && (isNaN(thresholdNum) || thresholdNum < 1)) {
      setError('Threshold amount must be 1 or greater');
      return;
    }
    
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const payload = {
        policyType: form.policyType,
        policyName: form.policyName,
        description: form.description,
        effectiveDate: form.effectiveDate,
        expirationDate: form.expirationDate || undefined,
        applicability: form.applicability,
        createdByEmployeeId: user.id,
        ruleDefinition: {
          percentage: percentageNum,
          fixedAmount: fixedAmountNum,
          thresholdAmount: thresholdNum,
          condition: ruleDefinition.condition || undefined,
        }
      };
      
      const res = await payrollConfigurationService.createPayrollPolicy(payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Payroll policy created successfully as DRAFT");
      setForm({ 
        policyType: "", 
        policyName: "", 
        description: "", 
        effectiveDate: "", 
        expirationDate: "", 
        applicability: "", 
        createdByEmployeeId: "" 
      });
      setRuleDefinition({
        percentage: "",
        fixedAmount: "",
        thresholdAmount: "",
        condition: "",
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create payroll policy");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(policy: PayrollPolicy) {
    if (policy.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT policies can be edited");
      return;
    }
    
    setEdit({ 
      id: policy.id, 
      policyType: policy.policyType ?? "", 
      policyName: policy.policyName ?? "", 
      description: policy.description ?? "", 
      effectiveDate: policy.effectiveDate.split('T')[0] ?? "", 
      expirationDate: policy.expirationDate?.split('T')[0] ?? "", 
      applicability: policy.applicability ?? "",
      ruleDefinition: {
        percentage: policy.ruleDefinition?.percentage?.toString() ?? "",
        fixedAmount: policy.ruleDefinition?.fixedAmount?.toString() ?? "",
        thresholdAmount: policy.ruleDefinition?.thresholdAmount?.toString() ?? "",
        condition: policy.ruleDefinition?.condition ?? "",
      }
    });
  }

  async function saveEdit() {
    if (!edit) return;
    
    // Validate that at least one rule definition field is filled
    if (!edit.ruleDefinition.percentage && !edit.ruleDefinition.fixedAmount && !edit.ruleDefinition.thresholdAmount) {
      setError('Please fill at least one rule definition field (percentage, fixed amount, or threshold)');
      return;
    }

    // Validate individual fields
    const percentageNum = edit.ruleDefinition.percentage ? parseFloat(edit.ruleDefinition.percentage) : 0;
    const fixedAmountNum = edit.ruleDefinition.fixedAmount ? parseFloat(edit.ruleDefinition.fixedAmount) : 0;
    const thresholdNum = edit.ruleDefinition.thresholdAmount ? parseFloat(edit.ruleDefinition.thresholdAmount) : 0;

    if (edit.ruleDefinition.percentage && (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100)) {
      setError('Percentage must be between 0 and 100');
      return;
    }
    
    if (edit.ruleDefinition.fixedAmount && (isNaN(fixedAmountNum) || fixedAmountNum < 0)) {
      setError('Fixed amount must be 0 or greater');
      return;
    }
    
    if (edit.ruleDefinition.thresholdAmount && (isNaN(thresholdNum) || thresholdNum < 1)) {
      setError('Threshold amount must be 1 or greater');
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      const payload = {
        policyType: edit.policyType,
        policyName: edit.policyName,
        description: edit.description,
        effectiveDate: edit.effectiveDate,
        expirationDate: edit.expirationDate || undefined,
        applicability: edit.applicability,
        ruleDefinition: {
          percentage: percentageNum,
          fixedAmount: fixedAmountNum,
          thresholdAmount: thresholdNum,
          condition: edit.ruleDefinition.condition || undefined,
        }
      };
      
      const res = await payrollConfigurationService.updatePayrollPolicy(edit.id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Payroll policy updated successfully");
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save changes");
    }
  }

  function cancelEdit() {
    setEdit(null);
  }

    async function approvePolicy(id: string) {
    setError(null);
    setSuccess(null);
    
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const payload = {
        approvedBy: user.id,
      };
      
      const res = await payrollConfigurationService.approvePayrollPolicy(id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Payroll policy approved successfully");
      setApproveConfirm(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to approve payroll policy");
    }
  }

  async function rejectPolicy(id: string) {
    setError(null);
    setSuccess(null);
    
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const payload = {
        approvedBy: user.id,
        rejectionReason: rejectionReason,
      };
      
      const res = await payrollConfigurationService.rejectPayrollPolicy(id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Payroll policy rejected successfully");
      setRejectConfirm(null);
      setRejectionReason("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to reject payroll policy");
    }
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
  
  function formatCurrency(amount: number) {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
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
      case ConfigStatus.PENDING_APPROVAL:
        return (
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getPolicyTypeIcon(type: string) {
    const policyType = policyTypes.find(t => t.value === type);
    return policyType?.icon || BookOpen;
  }

  function getPolicyTypeColor(type: string) {
    switch (type) {
      case 'Deduction':
        return 'bg-red-100 text-red-700';
      case 'Allowance':
        return 'bg-blue-100 text-blue-700';
      case 'Benefit':
        return 'bg-green-100 text-green-700';
      case 'Misconduct':
        return 'bg-orange-100 text-orange-700';
      case 'Leave':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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
            <span className="text-foreground font-medium">Payroll Policies</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Payroll Policies
              </h1>
              <p className="text-muted-foreground">
                Configure company-level payroll policies, deductions, benefits, and allowances
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
                Create New Payroll Policy
              </CardTitle>
              <CardDescription>
                Define a new company payroll policy. Drafts require manager approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="policyType">Policy Type *</Label>
                    <Select
                      value={form.policyType}
                      onValueChange={(value) => setForm((f) => ({ ...f, policyType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select policy type" />
                      </SelectTrigger>
                      <SelectContent>
                        {policyTypes.map((type) => {
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="applicability">Applicability *</Label>
                    <Select
                      value={form.applicability}
                      onValueChange={(value) => setForm((f) => ({ ...f, applicability: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select applicability" />
                      </SelectTrigger>
                      <SelectContent>
                        {applicabilityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policyName">Policy Name *</Label>
                  <Input
                    id="policyName"
                    placeholder="e.g., Annual Bonus Policy"
                    value={form.policyName}
                    onChange={(e) => setForm((f) => ({ ...f, policyName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    placeholder="Describe the policy details, purpose, and scope..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">Effective Date *</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={form.effectiveDate}
                      onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={form.expirationDate}
                      onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Rule Definition Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Rule Definition *
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="percentage">Percentage (0-100)</Label>
                      <div className="relative">
                        <Input
                          id="percentage"
                          type="number"
                          placeholder="0"
                          value={ruleDefinition.percentage}
                          onChange={(e) => setRuleDefinition((r) => ({ ...r, percentage: e.target.value }))}
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fixedAmount">Fixed Amount (USD)</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          id="fixedAmount"
                          type="number"
                          placeholder="0"
                          value={ruleDefinition.fixedAmount}
                          onChange={(e) => setRuleDefinition((r) => ({ ...r, fixedAmount: e.target.value }))}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="thresholdAmount">Threshold</Label>
                      <div className="relative">
                        <Input
                          id="thresholdAmount"
                          type="number"
                          placeholder="0"
                          value={ruleDefinition.thresholdAmount}
                          onChange={(e) => setRuleDefinition((r) => ({ ...r, thresholdAmount: e.target.value }))}
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="condition">Condition (Optional)</Label>
                    <Input
                      id="condition"
                      placeholder="e.g., Applies to employees with 1+ years of service"
                      value={ruleDefinition.condition}
                      onChange={(e) => setRuleDefinition((r) => ({ ...r, condition: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Guidelines</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Policy names should be clear and descriptive</li>
                    <li>At least one rule definition field (percentage, fixed amount, or threshold) must be filled</li>
                    <li>Effective date is required for all policies</li>
                    <li>Drafts will require manager approval before activation</li>
                    <li>Condition field is optional but recommended for clarity</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={create} 
                disabled={creating || !form.policyType || !form.policyName || !form.description || !form.effectiveDate || !form.applicability}
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
                    Create Policy Draft
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Information Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Policy Types
              </CardTitle>
              <CardDescription>
                Common payroll policy categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {policyTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.value} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className={`p-2 rounded-lg ${getPolicyTypeColor(type.value)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">{type.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {type.value === 'Deduction' && 'Salary reductions, taxes, loans'}
                          {type.value === 'Allowance' && 'Additional benefits and allowances'}
                          {type.value === 'Benefit' && 'Employee benefits and perks'}
                          {type.value === 'Misconduct' && 'Penalties and disciplinary actions'}
                          {type.value === 'Leave' && 'Vacation, sick leave, and time off'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Only draft policies can be edited or deleted</p>
                <p>• Approved policies require new draft for changes</p>
                <p>• Manager approval required for policy activation</p>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Policies List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              All Payroll Policies
            </CardTitle>
            <CardDescription>
              Manage existing payroll policies across all statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={policyTypeFilter} onValueChange={setPolicyTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Policy type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {policyTypes.map((type) => (
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
                    <SelectItem value={ConfigStatus.PENDING_APPROVAL}>Pending</SelectItem>
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
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {searchTerm || filter !== "all" || policyTypeFilter !== "all" ? "No matching policies" : "No policies yet"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filter !== "all" || policyTypeFilter !== "all" ? "Try adjusting your search or filter" : "Create your first policy using the form above"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Applicability</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((policy) => {
                      const Icon = getPolicyTypeIcon(policy.policyType);
                      return (
                        <TableRow key={policy.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${getPolicyTypeColor(policy.policyType)}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-foreground">
                                  {edit?.id === policy.id ? (
                                    <Input
                                      value={edit.policyName}
                                      onChange={(e) => setEdit((s) => (s ? { ...s, policyName: e.target.value } : s))}
                                      className="w-48"
                                    />
                                  ) : (
                                    policy.policyName
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                                  {edit?.id === policy.id ? (
                                    <textarea
                                      value={edit.description}
                                      onChange={(e) => setEdit((s) => (s ? { ...s, description: e.target.value } : s))}
                                      rows={2}
                                      className="w-full text-xs border rounded px-2 py-1"
                                    />
                                  ) : (
                                    policy.description
                                  )}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {edit?.id === policy.id ? (
                              <Select
                                value={edit.policyType}
                                onValueChange={(value) => setEdit((s) => (s ? { ...s, policyType: value } : s))}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {policyTypes.map((type) => {
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
                            ) : (
                              <Badge variant="outline" className={getPolicyTypeColor(policy.policyType)}>
                                {policy.policyType}
                              </Badge>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {edit?.id === policy.id ? (
                              <Select
                                value={edit.applicability}
                                onValueChange={(value) => setEdit((s) => (s ? { ...s, applicability: value } : s))}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {applicabilityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm">{policy.applicability || 'All Employees'}</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(policy.status)}
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(policy.effectiveDate)}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(policy.updatedAt)}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {edit?.id === policy.id ? (
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
                                    onClick={() => setView(policy)}
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {policy.status === ConfigStatus.DRAFT && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => beginEdit(policy)}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  {policy.status === ConfigStatus.PENDING_APPROVAL && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setApproveConfirm(policy.id)}
                                        title="Approve"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <FileCheck className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setRejectConfirm(policy.id)}
                                        title="Reject"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <FileX className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
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
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {items.length} total
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">All Policies</h3>
              <p className="text-xs text-muted-foreground mt-1">Total policy configurations</p>
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
              <p className="text-xs text-muted-foreground mt-1">Awaiting submission</p>
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
              <p className="text-xs text-muted-foreground mt-1">Active policies</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                  {items.filter(i => i.status === ConfigStatus.PENDING_APPROVAL).length} in review
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">Pending</h3>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Policy Details
            </DialogTitle>
            <DialogDescription>
              View complete information about this payroll policy
            </DialogDescription>
          </DialogHeader>
          
          {view && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getPolicyTypeColor(view.policyType)}`}>
                    {(() => {
                      const Icon = getPolicyTypeIcon(view.policyType);
                      return <Icon className="h-6 w-6" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{view.policyName}</h3>
                    <p className="text-sm text-muted-foreground">ID: {view.id}</p>
                  </div>
                </div>
                {getStatusBadge(view.status)}
              </div>

              {/* Policy Details */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Policy Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Policy Type</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getPolicyTypeColor(view.policyType)}>
                          {view.policyType}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Applicability</Label>
                      <p className="text-sm font-medium mt-1">{view.applicability || 'All Employees'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{view.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Effective Date</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{formatDate(view.effectiveDate)}</span>
                      </div>
                    </div>
                    {view.expirationDate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Expiration Date</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatDate(view.expirationDate)}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Created Date</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{formatDate(view.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rule Definition */}
              {view.ruleDefinition && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Rule Definition
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {view.ruleDefinition.percentage !== undefined && view.ruleDefinition.percentage > 0 && (
                        <div className="bg-primary/5 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Percentage</Label>
                            <Percent className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-2xl font-bold text-foreground mt-2">{view.ruleDefinition.percentage}%</p>
                        </div>
                      )}
                      {view.ruleDefinition.fixedAmount !== undefined && view.ruleDefinition.fixedAmount > 0 && (
                        <div className="bg-green-500/5 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Fixed Amount</Label>
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(view.ruleDefinition.fixedAmount)}</p>
                        </div>
                      )}
                      {view.ruleDefinition.thresholdAmount !== undefined && view.ruleDefinition.thresholdAmount > 0 && (
                        <div className="bg-blue-500/5 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Threshold</Label>
                            <Hash className="h-4 w-4 text-blue-600" />
                          </div>
                          <p className="text-2xl font-bold text-foreground mt-2">{view.ruleDefinition.thresholdAmount.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    {view.ruleDefinition.condition && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">Condition</Label>
                        <p className="text-sm mt-1 bg-muted/50 p-3 rounded-lg">{view.ruleDefinition.condition}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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

                {/* Rejection Reason */}
                {view.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <h5 className="font-medium text-red-800">Rejection Reason</h5>
                    </div>
                    <p className="text-red-700 text-sm">{view.rejectionReason}</p>
                  </div>
                )}
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
                Edit Policy
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Modal */}
      <Dialog open={!!approveConfirm} onOpenChange={(open) => !open && setApproveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              Approve Policy
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this payroll policy? Approved policies cannot be edited.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveConfirm && approvePolicy(approveConfirm)}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Modal */}
      <Dialog open={!!rejectConfirm} onOpenChange={(open) => !open && setRejectConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileX className="h-5 w-5 text-destructive" />
              Reject Policy
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payroll policy.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Please provide a reason for rejection..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectConfirm(null);
              setRejectionReason("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={!rejectionReason.trim()}
              onClick={() => rejectConfirm && rejectPolicy(rejectConfirm)}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}