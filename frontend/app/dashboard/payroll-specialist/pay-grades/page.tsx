"use client";

import { SetStateAction, useEffect, useMemo, useState } from "react";
import { payrollConfigurationService } from "@/app/services/payroll-configuration";
import { ConfigStatus } from "@/app/types/enums";
import type { PayGrade } from "@/app/types/payroll";
import { useAuth } from "@/app/context/AuthContext";
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
  Trash2,
  Users,
  ChevronRight,
  XCircle,
  Building,
  Calendar,
  FileText,
  Settings
} from "lucide-react";

type CreateForm = {
  grade: string;
  baseSalary: string;
  grossSalary: string;
};

type EditState = {
  id: string;
  grade: string;
  baseSalary: string;
  grossSalary: string;
} | null;

export default function PayGradesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<CreateForm>({ grade: "", baseSalary: "", grossSalary: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [filter, setFilter] = useState<"all" | ConfigStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<PayGrade | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function normalize(raw: any): PayGrade {
    return {
      id: raw.id ?? raw._id ?? String(Math.random()),
      grade: raw.grade ?? raw.name ?? raw.title ?? "",
      baseSalary: Number(raw.baseSalary ?? raw.base ?? raw.base_salary ?? 0),
      grossSalary: Number(raw.grossSalary ?? raw.gross ?? raw.gross_salary ?? 0),
      status: raw.status ?? raw.configStatus ?? ConfigStatus.DRAFT,
      createdBy: raw.createdBy ?? raw.creator ?? raw.created_by ?? undefined,
      approvedBy: raw.approvedBy ?? raw.approver ?? raw.approved_by ?? undefined,
      createdAt: raw.createdAt ?? raw.created_at ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
    } as PayGrade;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollConfigurationService.getPayGrades();
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      const data = (res as any)?.data;
      const candidates = [
        data?.payGrades,
        data?.data?.payGrades,
        data?.data,
        data,
        res,
      ];

      const list = candidates.find(Array.isArray) || [];
      setItems(list.map(normalize));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load pay grades");
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
      result = result.filter((pg) => {
        const searchText = [
          pg.grade,
          pg.createdBy,
          pg.approvedBy,
          pg.id
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [items, filter, searchTerm]);

  async function create() {
    if (!form.grade || !form.baseSalary || !form.grossSalary) {
      setError("Please fill in all fields");
      return;
    }
    
    if (!user?.id) {
      setError(`User not authenticated. Please log in again. (User: ${user ? 'exists but no ID' : 'null'})`);
      return;
    }
    
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const baseSalary = Number(form.baseSalary);
      const grossSalary = Number(form.grossSalary);
      
      if (baseSalary <= 0 || grossSalary <= 0) {
        throw new Error("Salaries must be greater than zero");
      }
      
      if (grossSalary < baseSalary) {
        throw new Error("Gross salary must be greater than or equal to base salary");
      }
      
      const payload = {
        grade: form.grade,
        baseSalary,
        grossSalary,
        createdByEmployeeId: user.id,
      };
      
      const res = await payrollConfigurationService.createPayGrade(payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Pay grade created successfully");
      setForm({ grade: "", baseSalary: "", grossSalary: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create pay grade");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(pg: PayGrade) {
    if (pg.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT pay grades can be edited");
      return;
    }
    
    setEdit({ 
      id: pg.id as any, 
      grade: pg.grade ?? "", 
      baseSalary: String(pg.baseSalary ?? 0), 
      grossSalary: String(pg.grossSalary ?? 0) 
    });
  }

  async function saveEdit() {
    if (!edit) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      const baseSalary = Number(edit.baseSalary);
      const grossSalary = Number(edit.grossSalary);
      
      if (baseSalary <= 0 || grossSalary <= 0) {
        throw new Error("Salaries must be greater than zero");
      }
      
      if (grossSalary < baseSalary) {
        throw new Error("Gross salary must be greater than or equal to base salary");
      }
      
      const payload = {
        grade: edit.grade,
        baseSalary,
        grossSalary,
      };
      
      const res = await payrollConfigurationService.updatePayGrade(edit.id as any, payload as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Pay grade updated successfully");
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save changes");
    }
  }

  function cancelEdit() {
    setEdit(null);
  }

  async function remove(id: string) {
    setError(null);
    setSuccess(null);
    
    try {
      const res = await payrollConfigurationService.deletePayGrade(id as any);
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Pay grade deleted successfully");
      setDeleteConfirm(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete pay grade");
    }
  }
  
  // Accept currency param, fallback to EGP
  function formatCurrency(amount: number, currency: string = 'EGP') {
    return `${currency} ${amount.toLocaleString('en-US', {
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
      default:
        return <Badge variant="outline">{status}</Badge>;
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
            <span className="text-foreground font-medium">Pay Grades</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Pay Grades
              </h1>
              <p className="text-muted-foreground">
                Define salary structures and manage pay grade configurations
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
                Create New Pay Grade
              </CardTitle>
              <CardDescription>
                Define a new salary grade. Drafts require manager approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade Name</Label>
                    <Input
                      id="grade"
                      placeholder="e.g., Senior TA"
                      value={form.grade}
                      onChange={(e: { target: { value: any; }; }) => setForm((f) => ({ ...f, grade: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Base Salary (EGP)</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      placeholder="0"
                      value={form.baseSalary}
                      onChange={(e: { target: { value: any; }; }) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grossSalary">Gross Salary (EGP)</Label>
                    <Input
                      id="grossSalary"
                      type="number"
                      placeholder="0"
                      value={form.grossSalary}
                      onChange={(e: { target: { value: any; }; }) => setForm((f) => ({ ...f, grossSalary: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Guidelines</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Grade names should be descriptive (e.g., "Senior Analyst", "Manager II")</li>
                    <li>Base salary is the minimum guaranteed pay for this grade</li>
                    <li>Gross salary includes all allowances and benefits</li>
                    <li>Drafts will require manager approval before activation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={create} 
                disabled={creating || !form.grade || !form.baseSalary || !form.grossSalary}
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
                    Create Pay Grade Draft
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
                Approval Process
              </CardTitle>
              <CardDescription>
                Understanding the pay grade lifecycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                  <div className="p-1 bg-primary/20 rounded">
                    <Edit className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Draft Creation</h4>
                    <p className="text-xs text-muted-foreground">
                      Specialists create pay grade drafts with proposed salary ranges
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg">
                  <div className="p-1 bg-amber-500/20 rounded">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Review Required</h4>
                    <p className="text-xs text-muted-foreground">
                      Drafts await manager review and approval before activation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
                  <div className="p-1 bg-success/20 rounded">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Approval & Activation</h4>
                    <p className="text-xs text-muted-foreground">
                      Approved grades become available for employee assignments
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg">
                  <div className="p-1 bg-purple-500/20 rounded">
                    <Building className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Future Integration</h4>
                    <p className="text-xs text-muted-foreground">
                      Department/Position linkage coming soon
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Only draft status items can be edited</p>
                <p>• Approved items require new draft for changes</p>
                <p>• Document approval rationale for compliance</p>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Pay Grades List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              All Pay Grades
            </CardTitle>
            <CardDescription>
              Manage existing pay grades across all statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pay grades..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e: { target: { value: SetStateAction<string>; }; }) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filter} onValueChange={(value: any) => setFilter(value as any)}>
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
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {searchTerm ? "No matching pay grades" : "No pay grades yet"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? "Try a different search term" : "Create your first pay grade using the form above"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade Name</TableHead>
                      <TableHead className="text-right">Base Salary</TableHead>
                      <TableHead className="text-right">Gross Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((pg) => (
                      <TableRow key={pg.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {edit?.id === pg.id ? (
                              <Input
                                value={edit.grade}
                                onChange={(e: { target: { value: any; }; }) => setEdit((s) => (s ? { ...s, grade: e.target.value } : s))}
                                className="w-32"
                              />
                            ) : (
                              pg.grade
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {edit?.id === pg.id ? (
                            <Input
                              type="number"
                              value={edit.baseSalary}
                              onChange={(e: { target: { value: any; }; }) => setEdit((s) => (s ? { ...s, baseSalary: e.target.value } : s))}
                              className="w-32 ml-auto"
                            />
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{formatCurrency(pg.baseSalary)}</span>
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {edit?.id === pg.id ? (
                            <Input
                              type="number"
                              value={edit.grossSalary}
                              onChange={(e: { target: { value: any; }; }) => setEdit((s) => (s ? { ...s, grossSalary: e.target.value } : s))}
                              className="w-32 ml-auto"
                            />
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{formatCurrency(pg.grossSalary)}</span>
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(pg.status)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {pg.createdBy || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {pg.approvedBy || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(pg.createdAt)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {edit?.id === pg.id ? (
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
                                  onClick={() => setView(pg)}
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                
                                {pg.status === ConfigStatus.DRAFT && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => beginEdit(pg)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm(pg.id)}
                                  title="Delete"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
              <h3 className="font-semibold text-foreground mt-3">All Grades</h3>
              <p className="text-xs text-muted-foreground mt-1">Total pay grade configurations</p>
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
              <p className="text-xs text-muted-foreground mt-1">Ready for use</p>
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
      <Dialog open={!!view} onOpenChange={(open: any) => !open && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Pay Grade Details
            </DialogTitle>
            <DialogDescription>
              View complete information about this pay grade configuration
            </DialogDescription>
          </DialogHeader>
          
          {view && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{view.grade}</h3>
                  <p className="text-sm text-muted-foreground">ID: {view.id}</p>
                </div>
                {getStatusBadge(view.status)}
              </div>

              {/* Salary Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Base Salary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(view.baseSalary)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Minimum guaranteed pay for this grade
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Gross Salary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(view.grossSalary)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total pay including all allowances
                    </p>
                  </CardContent>
                </Card>
              </div>

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
                Edit Pay Grade
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open: any) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pay grade? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && remove(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}