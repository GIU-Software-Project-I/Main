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
  Calculator,
  TrendingUp,
  Percent,
  CalendarDays,
  Hash
} from "lucide-react";

// Status enum to match Pay Grades page
enum ConfigStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_APPROVAL = 'pending_approval'
}

interface PayType {
  id: string;
  type: string;
  amount: number;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  __v?: number;
}

// Predefined pay types
const payTypeOptions = [
  { value: 'Hourly', label: 'Hourly' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Contract-Based', label: 'Contract-Based' },
];

// Form types
type CreateForm = {
  type: string;
  amount: string;
};

type EditState = {
  id: string;
  type: string;
  amount: string;
} | null;

// Calculate form type
type CalculateForm = {
  hoursPerWeek: string;
  weeksPerMonth: string;
  contractDuration: string;
  roleType: string;
};

export default function PayTypesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<CreateForm>({ type: "", amount: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<PayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [filter, setFilter] = useState<"all" | ConfigStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<PayType | null>(null);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [selectedPayType, setSelectedPayType] = useState<PayType | null>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  
  // Calculate form state
  const [calculateForm, setCalculateForm] = useState<CalculateForm>({
    hoursPerWeek: "40",
    weeksPerMonth: "4",
    contractDuration: "12",
    roleType: "full-time",
  });

  function normalize(raw: any): PayType {
    return {
      id: raw.id ?? raw._id ?? String(Math.random()),
      type: raw.type ?? "",
      amount: Number(raw.amount ?? 0),
      status: raw.status ?? ConfigStatus.DRAFT,
      createdBy: raw.createdBy ?? raw.createdByEmployeeId ?? undefined,
      approvedBy: raw.approvedBy ?? undefined,
      createdAt: raw.createdAt ?? raw.created_at ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
      approvedAt: raw.approvedAt ?? raw.approved_at ?? undefined,
      rejectionReason: raw.rejectionReason ?? undefined,
      __v: raw.__v ?? undefined,
    } as PayType;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollConfigurationService.getPayTypes();
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
      setError(e?.message ?? "Failed to load pay types");
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
    
    if (searchTerm) {
      result = result.filter((pt) => {
        const searchText = [
          pt.type,
          pt.createdBy,
          pt.approvedBy,
          pt.id
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [items, filter, searchTerm]);

  async function create() {
    if (!form.type || !form.amount) {
      setError("Please fill in all fields");
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
      const amount = Number(form.amount);
      
      if (amount < 6000) {
        throw new Error("Amount must be at least $6,000 (industry minimum wage standard)");
      }
      
      const payload = {
        type: form.type,
        amount,
        createdByEmployeeId: user.id,
      };
      
      const res = await payrollConfigurationService.createPayType(payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Pay type created successfully as DRAFT");
      setForm({ type: "", amount: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create pay type");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(pt: PayType) {
    if (pt.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT pay types can be edited");
      return;
    }
    
    setEdit({ 
      id: pt.id, 
      type: pt.type ?? "", 
      amount: String(pt.amount ?? 0)
    });
  }

  async function saveEdit() {
    if (!edit) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      const amount = Number(edit.amount);
      
      if (amount < 6000) {
        throw new Error("Amount must be at least $6,000");
      }
      
      const payload = {
        type: edit.type,
        amount,
      };
      
      const res = await payrollConfigurationService.updatePayType(edit.id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Pay type updated successfully");
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save changes");
    }
  }

  function cancelEdit() {
    setEdit(null);
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

  function handleCalculateClick(pt: PayType) {
    if (pt.status !== ConfigStatus.APPROVED) {
      setError("Only APPROVED pay types can be used for calculation");
      return;
    }
    
    setSelectedPayType(pt);
    setCalculateForm({
      hoursPerWeek: "40",
      weeksPerMonth: "4",
      contractDuration: "12",
      roleType: "full-time",
    });
    setCalculationResult(null);
    setShowCalculateModal(true);
  }

  function handleCalculateSalary() {
    if (!selectedPayType) return;

    const hoursPerWeek = parseFloat(calculateForm.hoursPerWeek) || 40;
    const weeksPerMonth = parseFloat(calculateForm.weeksPerMonth) || 4;
    const contractDuration = parseFloat(calculateForm.contractDuration) || 12;
    const roleType = calculateForm.roleType;
    const baseAmount = selectedPayType.amount;
    let baseSalary = 0;
    let calculation = '';

    switch (roleType) {
      case 'full-time':
        baseSalary = baseAmount * contractDuration;
        calculation = `${formatCurrency(baseAmount)} × ${contractDuration} months (Full-time)`;
        break;
      case 'part-time':
        baseSalary = baseAmount * 0.5 * contractDuration;
        calculation = `${formatCurrency(baseAmount)} × 0.5 × ${contractDuration} months (Part-time)`;
        break;
      case 'hourly':
        baseSalary = baseAmount * hoursPerWeek * weeksPerMonth * contractDuration;
        calculation = `${formatCurrency(baseAmount)} × ${hoursPerWeek} hrs/wk × ${weeksPerMonth} wks/mo × ${contractDuration} months (Hourly)`;
        break;
      case 'commission-based':
        baseSalary = baseAmount * contractDuration;
        calculation = `${formatCurrency(baseAmount)} × ${contractDuration} months (Commission-based, excludes commission)`;
        break;
      default:
        baseSalary = baseAmount * contractDuration;
        calculation = `${formatCurrency(baseAmount)} × ${contractDuration} months`;
    }

    setCalculationResult({
      baseSalary: Math.round(baseSalary * 100) / 100,
      monthlySalary: Math.round((baseSalary / contractDuration) * 100) / 100,
      calculation,
      payType: selectedPayType.type,
      roleType,
      contractDuration,
    });
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
            <span className="text-foreground font-medium">Pay Types</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Pay Types
              </h1>
              <p className="text-muted-foreground">
                Define employee pay types for salary calculation and compensation management
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
                Create New Pay Type
              </CardTitle>
              <CardDescription>
                Define a new pay type for salary calculation. Drafts require manager approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Pay Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pay type" />
                      </SelectTrigger>
                      <SelectContent>
                        {payTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="6000"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Guidelines</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Select from predefined pay types (Hourly, Daily, Weekly, Monthly, Contract-Based)</li>
                    <li>Minimum amount is $6,000 based on industry minimum wage standards</li>
                    <li>Drafts will require manager approval before activation</li>
                    <li>Approved pay types can be used for salary calculations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={create} 
                disabled={creating || !form.type || !form.amount}
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
                    Create Pay Type Draft
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Information Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Salary Calculation
              </CardTitle>
              <CardDescription>
                Understanding pay type calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                  <div className="p-1 bg-primary/20 rounded">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Base Calculations</h4>
                    <p className="text-xs text-muted-foreground">
                      Each pay type has specific calculation formulas
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                  <div className="p-1 bg-green-500/20 rounded">
                    <Percent className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Role Multipliers</h4>
                    <p className="text-xs text-muted-foreground">
                      Full-time, part-time, hourly, and commission-based roles
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg">
                  <div className="p-1 bg-purple-500/20 rounded">
                    <CalendarDays className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Contract Terms</h4>
                    <p className="text-xs text-muted-foreground">
                      Duration, hours, and weeks affect final calculations
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg">
                  <div className="p-1 bg-amber-500/20 rounded">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Approval Required</h4>
                    <p className="text-xs text-muted-foreground">
                      Drafts await manager review before calculation use
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Only approved pay types can be used for calculations</p>
                <p>• Drafts require manager approval for activation</p>
                <p>• Minimum amount enforced at $6,000</p>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Pay Types List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              All Pay Types
            </CardTitle>
            <CardDescription>
              Manage existing pay types across all statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pay types..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
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
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {searchTerm ? "No matching pay types" : "No pay types yet"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? "Try a different search term" : "Create your first pay type using the form above"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pay Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((pt) => (
                      <TableRow key={pt.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {edit?.id === pt.id ? (
                              <Select
                                value={edit.type}
                                onValueChange={(value) => setEdit((s) => (s ? { ...s, type: value } : s))}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {payTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              pt.type
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {edit?.id === pt.id ? (
                            <Input
                              type="number"
                              value={edit.amount}
                              onChange={(e) => setEdit((s) => (s ? { ...s, amount: e.target.value } : s))}
                              className="w-32 ml-auto"
                            />
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{formatCurrency(pt.amount)}</span>
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(pt.status)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {pt.createdBy || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {pt.approvedBy || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(pt.createdAt)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {edit?.id === pt.id ? (
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
                                  onClick={() => setView(pt)}
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                
                                {pt.status === ConfigStatus.DRAFT && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => beginEdit(pt)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {pt.status === ConfigStatus.APPROVED && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCalculateClick(pt)}
                                    title="Calculate"
                                  >
                                    <Calculator className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {items.length} total
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">All Types</h3>
              <p className="text-xs text-muted-foreground mt-1">Total pay type configurations</p>
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
              Pay Type Details
            </DialogTitle>
            <DialogDescription>
              View complete information about this pay type configuration
            </DialogDescription>
          </DialogHeader>
          
          {view && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{view.type}</h3>
                  <p className="text-sm text-muted-foreground">ID: {view.id}</p>
                </div>
                {getStatusBadge(view.status)}
              </div>

              {/* Amount Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Base Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(view.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Base rate for {view.type.toLowerCase()} pay type calculations
                  </p>
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
                Edit Pay Type
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculate Modal */}
      <Dialog open={showCalculateModal} onOpenChange={setShowCalculateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculate Base Salary
            </DialogTitle>
            <DialogDescription>
              Calculate salary based on {selectedPayType?.type} rate and contract terms
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayType && (
            <div className="space-y-6">
              {/* Pay Type Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Pay Type</p>
                    <p className="text-lg font-bold text-purple-900">{selectedPayType.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-purple-800">Base Rate</p>
                    <p className="text-lg font-bold text-purple-900">{formatCurrency(selectedPayType.amount)}</p>
                  </div>
                </div>
              </div>

              {/* Contract Terms */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Contract Terms</h4>
                
                {(selectedPayType.type === 'Hourly') && (
                  <div>
                    <Label htmlFor="hoursPerWeek" className="mb-2">
                      Hours Per Week
                    </Label>
                    <Input
                      type="number"
                      id="hoursPerWeek"
                      value={calculateForm.hoursPerWeek}
                      onChange={(e) => setCalculateForm(f => ({ ...f, hoursPerWeek: e.target.value }))}
                      placeholder="e.g., 40"
                      min="1"
                      max="168"
                    />
                  </div>
                )}

                {(selectedPayType.type === 'Hourly' || selectedPayType.type === 'Daily' || selectedPayType.type === 'Weekly') && (
                  <div>
                    <Label htmlFor="weeksPerMonth" className="mb-2">
                      Weeks Per Month
                    </Label>
                    <Input
                      type="number"
                      id="weeksPerMonth"
                      value={calculateForm.weeksPerMonth}
                      onChange={(e) => setCalculateForm(f => ({ ...f, weeksPerMonth: e.target.value }))}
                      placeholder="e.g., 4"
                      min="1"
                      max="5"
                      step="0.5"
                    />
                  </div>
                )}

                {selectedPayType.type !== 'Contract-Based' && (
                  <div>
                    <Label htmlFor="contractDuration" className="mb-2">
                      Contract Duration (Months)
                    </Label>
                    <Input
                      type="number"
                      id="contractDuration"
                      value={calculateForm.contractDuration}
                      onChange={(e) => setCalculateForm(f => ({ ...f, contractDuration: e.target.value }))}
                      placeholder="e.g., 12"
                      min="1"
                      max="60"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="roleType" className="mb-2">
                    Role Type
                  </Label>
                  <Select
                    value={calculateForm.roleType}
                    onValueChange={(value) => setCalculateForm(f => ({ ...f, roleType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="commission-based">Commission-based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Role type affects the salary multiplier based on employment agreement
                  </p>
                </div>
              </div>

              {/* Calculation Result */}
              {calculationResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-green-900">Calculation Result</h4>
                  
                  <div className="text-sm text-green-700 bg-green-100 p-3 rounded font-mono">
                    {calculationResult.calculation}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700">Total Contract Salary</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(calculationResult.baseSalary)}
                      </p>
                    </div>
                    {calculationResult.payType !== 'Contract-Based' && (
                      <div>
                        <p className="text-sm text-green-700">Monthly Equivalent</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(calculationResult.monthlySalary)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-green-600 pt-2 border-t border-green-200">
                    <p>Based on {calculationResult.roleType} role for {calculationResult.contractDuration} month(s)</p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 text-sm mb-2">Calculation Formula</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• <strong>Hourly:</strong> Rate × Hours/Week × Weeks/Month × Months × Role Multiplier</li>
                  <li>• <strong>Daily:</strong> Rate × 5 Days/Week × Weeks/Month × Months × Role Multiplier</li>
                  <li>• <strong>Weekly:</strong> Rate × Weeks/Month × Months × Role Multiplier</li>
                  <li>• <strong>Monthly:</strong> Rate × Months × Role Multiplier</li>
                  <li>• <strong>Contract-Based:</strong> Contract Value × Role Multiplier</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCalculateModal(false);
              setCalculationResult(null);
            }}>
              Close
            </Button>
            <Button onClick={handleCalculateSalary} className="bg-purple-600 hover:bg-purple-700">
              Calculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}