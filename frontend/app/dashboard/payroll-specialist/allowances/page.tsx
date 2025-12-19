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
  Gift,
  Home,
  Car,
  Utensils,
  Briefcase,
  Plane,
  Watch,
  Phone,
  Music
} from "lucide-react";

// Status enum
enum ConfigStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_APPROVAL = 'pending_approval'
}

interface Allowance {
  id: string;
  name: string;
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

// Common allowance types with icons
const commonAllowanceTypes = [
  { value: 'Housing Allowance', label: 'Housing Allowance', icon: Home },
  { value: 'Transportation Allowance', label: 'Transportation Allowance', icon: Car },
  { value: 'Meal Allowance', label: 'Meal Allowance', icon: Utensils },
  { value: 'Medical Allowance', label: 'Medical Allowance', icon: Briefcase },
  { value: 'Education Allowance', label: 'Education Allowance', icon: FileText },
  { value: 'Travel Allowance', label: 'Travel Allowance', icon: Plane },
  { value: 'Overtime Allowance', label: 'Overtime Allowance', icon: Clock },
  { value: 'Uniform Allowance', label: 'Uniform Allowance', icon: Watch },
  { value: 'Communication Allowance', label: 'Communication Allowance', icon: Phone },
  { value: 'Entertainment Allowance', label: 'Entertainment Allowance', icon: Music },
];

// Form types
type CreateForm = {
  name: string;
  amount: string;
};

type EditState = {
  id: string;
  name: string;
  amount: string;
} | null;

export default function AllowancesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<CreateForm>({ name: "", amount: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [filter, setFilter] = useState<"all" | ConfigStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<Allowance | null>(null);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  function normalize(raw: any): Allowance {
    return {
      id: raw.id ?? raw._id ?? String(Math.random()),
      name: raw.name ?? "",
      amount: Number(raw.amount ?? 0),
      status: raw.status ?? ConfigStatus.DRAFT,
      createdBy: raw.createdBy ?? raw.createdByEmployeeId ?? undefined,
      approvedBy: raw.approvedBy ?? undefined,
      createdAt: raw.createdAt ?? raw.created_at ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
      approvedAt: raw.approvedAt ?? raw.approved_at ?? undefined,
      rejectionReason: raw.rejectionReason ?? undefined,
      __v: raw.__v ?? undefined,
    } as Allowance;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: filter !== "all" ? filter : undefined,
      };
      
      const res = await payrollConfigurationService.getAllowances(queryParams);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      const data = (res as any)?.data;
      const candidates = [data?.data, data, res];

      const list = candidates.find(Array.isArray) || [];
      const normalizedItems = list.map(normalize);
      
      setItems(normalizedItems);
      
      // Update pagination if available from API
      if (data?.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          total: data.total,
          totalPages: data.totalPages || Math.ceil(data.total / prev.limit),
        }));
      } else {
        setPagination(prev => ({
          ...prev,
          total: normalizedItems.length,
          totalPages: 1,
        }));
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load allowances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filter, searchTerm]);

  const filtered = useMemo(() => {
    let result = items;
    
    if (filter !== "all") {
      result = result.filter((i) => i.status === filter);
    }
    
    if (searchTerm) {
      result = result.filter((allowance) => {
        const searchText = [
          allowance.name,
          allowance.createdBy,
          allowance.approvedBy,
          allowance.id
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [items, filter, searchTerm]);

  async function create() {
    if (!form.name || !form.amount) {
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
      
      if (amount < 0) {
        throw new Error("Amount must be 0 or greater");
      }
      
      const payload = {
        name: form.name,
        amount,
        createdByEmployeeId: user.id,
      };
      
      const res = await payrollConfigurationService.createAllowance(payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Allowance created successfully as DRAFT");
      setForm({ name: "", amount: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create allowance");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(allowance: Allowance) {
    if (allowance.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT allowances can be edited");
      return;
    }
    
    setEdit({ 
      id: allowance.id, 
      name: allowance.name ?? "", 
      amount: String(allowance.amount ?? 0)
    });
  }

  async function saveEdit() {
    if (!edit) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      const amount = Number(edit.amount);
      
      if (amount < 0) {
        throw new Error("Amount must be 0 or greater");
      }
      
      const payload = {
        name: edit.name,
        amount,
      };
      
      const res = await payrollConfigurationService.updateAllowance(edit.id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Allowance updated successfully");
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

  function getAllowanceIcon(name: string) {
    const allowanceType = commonAllowanceTypes.find(type => 
      name.toLowerCase().includes(type.value.toLowerCase().split(' ')[0])
    );
    return allowanceType?.icon || Gift;
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
            <span className="text-foreground font-medium">Allowances</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Allowances
              </h1>
              <p className="text-muted-foreground">
                Define and manage employee allowances (housing, transportation, meals, etc.)
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
                Create New Allowance
              </CardTitle>
              <CardDescription>
                Define a new employee allowance. Drafts require manager approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Allowance Name</Label>
                    <div className="relative">
                      <Select
                        value={form.name}
                        onValueChange={(value) => setForm((f) => ({ ...f, name: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select allowance type" />
                        </SelectTrigger>
        <SelectContent>
  <SelectItem value="custom">Custom Allowance</SelectItem>
  {commonAllowanceTypes.map((type) => (
    <SelectItem key={type.value} value={type.value}>
      <div className="flex items-center gap-2">
        <type.icon className="h-4 w-4" />
        {type.label}
      </div>
    </SelectItem>
  ))}
</SelectContent>
                      </Select>
                    </div>
                    {!commonAllowanceTypes.some(t => t.value === form.name) && form.name && (
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Or enter custom allowance name"
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="500"
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
                    <li>Select from common allowance types or enter a custom name</li>
                    <li>Amount must be 0 or greater (tax-free allowances can be $0)</li>
                    <li>Drafts will require manager approval before activation</li>
                    <li>Approved allowances can be assigned to employee payrolls</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={create} 
                disabled={creating || !form.name || !form.amount}
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
                    Create Allowance Draft
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Information Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Allowance Types
              </CardTitle>
              <CardDescription>
                Common allowance categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commonAllowanceTypes.slice(0, 6).map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.value} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">{type.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {type.value.includes('Housing') && 'Accommodation support'}
                          {type.value.includes('Transportation') && 'Commute expenses'}
                          {type.value.includes('Meal') && 'Food and dining'}
                          {type.value.includes('Medical') && 'Healthcare costs'}
                          {type.value.includes('Education') && 'Learning and development'}
                          {type.value.includes('Travel') && 'Business trip expenses'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Only draft status items can be edited</p>
                <p>• Approved items require new draft for changes</p>
                <p>• Duplicate allowance names are not allowed</p>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Allowances List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              All Allowances
            </CardTitle>
            <CardDescription>
              Manage existing allowances across all statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search allowances..."
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
                      <Gift className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {searchTerm || filter !== "all" ? "No matching allowances" : "No allowances yet"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filter !== "all" ? "Try adjusting your search or filter" : "Create your first allowance using the form above"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Allowance Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((allowance) => {
                      const Icon = getAllowanceIcon(allowance.name);
                      return (
                        <TableRow key={allowance.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="font-medium text-foreground">
                                {edit?.id === allowance.id ? (
                                  <Select
                                    value={edit.name}
                                    onValueChange={(value) => setEdit((s) => (s ? { ...s, name: value } : s))}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue />
                                    </SelectTrigger>
                        <SelectContent>
  <SelectItem value="custom">Custom Allowance</SelectItem>
  {commonAllowanceTypes.map((type) => (
    <SelectItem key={type.value} value={type.value}>
      <div className="flex items-center gap-2">
        <type.icon className="h-4 w-4" />
        {type.label}
      </div>
    </SelectItem>
  ))}
</SelectContent>
                                  </Select>
                                ) : (
                                  allowance.name
                                )}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            {edit?.id === allowance.id ? (
                              <Input
                                type="number"
                                value={edit.amount}
                                onChange={(e) => setEdit((s) => (s ? { ...s, amount: e.target.value } : s))}
                                className="w-32 ml-auto"
                              />
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{formatCurrency(allowance.amount)}</span>
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(allowance.status)}
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm">
                              {allowance.createdBy || (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm">
                              {allowance.approvedBy || (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(allowance.createdAt)}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {edit?.id === allowance.id ? (
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
                                    onClick={() => setView(allowance)}
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {allowance.status === ConfigStatus.DRAFT && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => beginEdit(allowance)}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} allowances
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
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
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
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
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {pagination.total} total
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">All Allowances</h3>
              <p className="text-xs text-muted-foreground mt-1">Total allowance configurations</p>
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
              <p className="text-xs text-muted-foreground mt-1">Ready for assignment</p>
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
              Allowance Details
            </DialogTitle>
            <DialogDescription>
              View complete information about this allowance configuration
            </DialogDescription>
          </DialogHeader>
          
          {view && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    {(() => {
                      const Icon = getAllowanceIcon(view.name);
                      return <Icon className="h-6 w-6 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{view.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {view.id}</p>
                  </div>
                </div>
                {getStatusBadge(view.status)}
              </div>

              {/* Amount Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Monthly Amount
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
                    Monthly allowance amount for employee payroll
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
                Edit Allowance
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}