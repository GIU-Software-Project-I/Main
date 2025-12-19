"use client";

import { useEffect, useMemo, useState } from "react";
import { payrollConfigurationService } from "@/app/services/payroll-configuration";
import { ConfigStatus } from "@/app/types/enums";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
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
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  Search,
  Settings,
  Shield,
  Trash2,
  Users,
  ChevronRight,
  DollarSign,
  Building,
  Calendar,
  RefreshCw,
  XCircle,
  FileSpreadsheet,
  CreditCard,
  Receipt,
  Gift,
  DoorOpen,
  TrendingUp,
  Package
} from "lucide-react";

interface ConfigItem {
  id: string;
  name?: string;
  title?: string;
  status: ConfigStatus;
  createdAt?: string;
  [key: string]: any;
}

type EditState = {
  id: string;
  [key: string]: any;
} | null;

export default function PayrollSystemConfigurationApprovalPage() {
  const { user } = useAuth();
  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "payGrades");
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [filter, setFilter] = useState<ConfigStatus | "all">("all");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<ConfigItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "payGrades", label: "Pay Grades", icon: CreditCard, color: "text-blue-600", bgColor: "bg-blue-100" },
    { id: "payrollPolicies", label: "Payroll Policies", icon: FileText, color: "text-purple-600", bgColor: "bg-purple-100" },
    { id: "payTypes", label: "Pay Types", icon: Receipt, color: "text-green-600", bgColor: "bg-green-100" },
    { id: "allowances", label: "Allowances", icon: Package, color: "text-amber-600", bgColor: "bg-amber-100" },
    { id: "signingBonuses", label: "Signing Bonuses", icon: Gift, color: "text-pink-600", bgColor: "bg-pink-100" },
    { id: "terminationBenefits", label: "Termination Benefits", icon: DoorOpen, color: "text-red-600", bgColor: "bg-red-100" },
    { id: "taxRules", label: "Tax Rules", icon: TrendingUp, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  ];

  const filtered = useMemo(() => {
    let result = items;
    
    // Apply status filter
    if (filter !== "all") {
      result = result.filter((item) => item.status === filter);
    }
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter((item) => {
        const searchText = [
          item.name,
          item.title,
          item.grade,
          item.type,
          item.description,
          item.id
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [items, filter, searchTerm]);

  const normalize = (raw: any): ConfigItem => {
    let displayName = "";
    
    if (activeTab === "payGrades") {
      displayName = raw.grade || raw.name || "";
    } else if (activeTab === "payTypes") {
      displayName = raw.type || raw.name || "";
    } else if (activeTab === "taxRules") {
      displayName = raw.name || raw.ruleName || "";
    } else if (activeTab === "allowances") {
      displayName = raw.name || raw.allowanceName || "";
    } else if (activeTab === "signingBonuses") {
      displayName = raw.positionName || raw.name || raw.bonusName || "";
    } else if (activeTab === "terminationBenefits") {
      displayName = raw.name || raw.benefitName || "";
    } else {
      displayName = raw.name || raw.title || raw.policyName || raw.typeName || "";
    }
    
    return {
      id: raw._id || raw.id,
      name: displayName,
      title: displayName,
      status: raw.status || ConfigStatus.DRAFT,
      createdAt: raw.createdAt,
      ...raw,
    };
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.getPayGrades();
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.getPayrollPolicies();
          break;
        case "payTypes":
          res = await payrollConfigurationService.getPayTypes();
          break;
        case "allowances":
          res = await payrollConfigurationService.getAllowances();
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.getSigningBonuses();
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.getTerminationBenefits();
          break;
        case "taxRules":
          res = await payrollConfigurationService.getTaxRules();
          break;
        default:
          res = { data: [] };
      }

      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      let rawData: any[] = [];
      
      if (res?.data) {
        const data = res.data as any;
        if (Array.isArray(data)) {
          rawData = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawData = data.data;
        } else if (data.statusCode && data.data && Array.isArray(data.data)) {
          rawData = data.data;
        } else if (typeof data === 'object') {
          const keys = Object.keys(data);
          for (const key of keys) {
            if (Array.isArray(data[key])) {
              rawData = data[key];
              break;
            }
          }
        }
      } else if (Array.isArray(res)) {
        rawData = res;
      }
      
      setItems(Array.isArray(rawData) ? rawData.map(normalize) : []);
    } catch (e: any) {
      console.error(`Failed to load ${activeTab}:`, e);
      setError(e?.message || `Failed to load ${activeTab}. Please check if the backend is running.`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeTab]);

  const approve = async (id: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let res;
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.approvePayGrade(id, { approvedBy: user.id });
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.approvePayrollPolicy(id, { approvedBy: user.id });
          break;
        case "payTypes":
          res = await payrollConfigurationService.approvePayType(id, { approvedBy: user.id });
          break;
        case "allowances":
          res = await payrollConfigurationService.approveAllowance(id, { approvedBy: user.id });
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.approveSigningBonus(id, { approvedBy: user.id });
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.approveTerminationBenefit(id, { approvedBy: user.id });
          break;
        case "taxRules":
          res = await payrollConfigurationService.approveTaxRule(id, { approvedBy: user.id });
          break;
      }
      
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Configuration approved successfully");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    }
  };

  const reject = async (id: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let res;
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.rejectPayGrade(id, { approvedBy: user.id });
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.rejectPayrollPolicy(id, { approvedBy: user.id });
          break;
        case "payTypes":
          res = await payrollConfigurationService.rejectPayType(id, { approvedBy: user.id });
          break;
        case "allowances":
          res = await payrollConfigurationService.rejectAllowance(id, { approvedBy: user.id });
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.rejectSigningBonus(id, { approvedBy: user.id });
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.rejectTerminationBenefit(id, { approvedBy: user.id });
          break;
        case "taxRules":
          res = await payrollConfigurationService.rejectTaxRule(id, { approvedBy: user.id });
          break;
      }
      
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Configuration rejected");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let res;
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.deletePayGrade(id);
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.deletePayrollPolicy(id);
          break;
        case "payTypes":
          res = await payrollConfigurationService.deletePayType(id);
          break;
        case "allowances":
          res = await payrollConfigurationService.deleteAllowance(id);
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.deleteSigningBonus(id);
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.deleteTerminationBenefit(id);
          break;
        case "taxRules":
          res = await payrollConfigurationService.deleteTaxRule(id);
          break;
      }
      
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Configuration deleted successfully");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
    }
  };

  const viewItem = (item: ConfigItem) => {
    setView(item);
  };

  const closeView = () => setView(null);

  const beginEdit = (item: ConfigItem) => {
    if (item.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT configurations can be edited.");
      return;
    }

    setEdit(item);
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEdit(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (!edit) return;

    setError(null);
    setSuccess(null);

    try {
      let res;
      let payload: any = {};

      if (activeTab === "payGrades") {
        payload = {
          grade: edit.grade,
          baseSalary: Number(edit.baseSalary),
          grossSalary: Number(edit.grossSalary),
        };
        res = await payrollConfigurationService.updatePayGrade(edit.id, payload);
      } else if (activeTab === "payrollPolicies") {
        payload = {
          name: edit.name,
          description: edit.description,
        };
        res = await payrollConfigurationService.updatePayrollPolicy(edit.id, payload);
      } else if (activeTab === "payTypes") {
        const amountNumber = Number(edit.amount);
        if (!Number.isFinite(amountNumber)) {
          throw new Error("Please enter a valid amount for the pay type");
        }

        payload = {
          name: edit.name,
          description: edit.description,
          amount: amountNumber,
        };
        res = await payrollConfigurationService.updatePayType(edit.id, payload);
      } else if (activeTab === "allowances") {
        payload = {
          name: edit.name,
          description: edit.description,
          amount: Number(edit.amount),
        };
        res = await payrollConfigurationService.updateAllowance(edit.id, payload);
      } else if (activeTab === "signingBonuses") {
        payload = {
          name: edit.name,
          description: edit.description,
          amount: Number(edit.amount),
        };
        res = await payrollConfigurationService.updateSigningBonus(edit.id, payload);
      } else if (activeTab === "terminationBenefits") {
        payload = {
          name: edit.name,
          description: edit.description,
          amount: Number(edit.amount),
        };
        res = await payrollConfigurationService.updateTerminationBenefit(edit.id, payload);
      } else if (activeTab === "taxRules") {
        payload = {
          name: edit.name,
          description: edit.description,
        };
        res = await payrollConfigurationService.updateTaxRule(edit.id, payload);
      }

      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      setSuccess("Configuration updated successfully");
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update configuration");
    }
  };

  const getStatusBadge = (status: ConfigStatus) => {
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
  };

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
            <span className="hover:text-primary transition-colors">Payroll Administration</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Configuration Approval</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Configuration Approval
              </h1>
              <p className="text-muted-foreground">
                Review, approve, reject, and manage all payroll configuration types
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Configuration Panel */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration Management
              </CardTitle>
              <CardDescription>
                Manage payroll configurations across all categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value={activeTab} className="space-y-6">
                  {/* Edit Form */}
                  {edit && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Edit className="h-5 w-5" />
                          Edit Configuration
                        </CardTitle>
                        <CardDescription>
                          Update configuration details
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Edit form fields based on activeTab */}
                        {activeTab === "payGrades" && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Grade Name</Label>
                              <Input
                                value={edit.grade || ""}
                                onChange={(e) => setEdit({ ...edit, grade: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Base Salary (EGP)</Label>
                              <Input
                                type="number"
                                value={edit.baseSalary || ""}
                                onChange={(e) => setEdit({ ...edit, baseSalary: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Gross Salary (EGP)</Label>
                              <Input
                                type="number"
                                value={edit.grossSalary || ""}
                                onChange={(e) => setEdit({ ...edit, grossSalary: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {/* Add other edit forms for different configuration types */}
                        
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                          <Button onClick={saveEdit}>
                            Save Changes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search configurations..."
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
                          <SelectItem value={ConfigStatus.APPROVED}>Approved</SelectItem>
                          <SelectItem value={ConfigStatus.REJECTED}>Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={load}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Configurations Table */}
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
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-medium text-foreground mb-1">No configurations found</h3>
                          <p className="text-muted-foreground">
                            {searchTerm ? "Try a different search term" : "Create or import configurations to get started"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name / Description</TableHead>
                              {activeTab === "payGrades" && (
                                <>
                                  <TableHead className="text-right">Base Salary</TableHead>
                                  <TableHead className="text-right">Gross Salary</TableHead>
                                </>
                              )}
                              {activeTab === "payTypes" && (
                                <TableHead className="text-right">Amount</TableHead>
                              )}
                              {(activeTab === "allowances" || activeTab === "signingBonuses" || activeTab === "terminationBenefits") && (
                                <TableHead className="text-right">Amount</TableHead>
                              )}
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-foreground">
                                      {item.name || item.grade || item.title || "Unnamed"}
                                    </div>
                                    {item.description && (
                                      <div className="text-sm text-muted-foreground line-clamp-1">
                                        {item.description}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                
                                {/* Type-specific columns */}
                                {activeTab === "payGrades" && (
                                  <>
                                    <TableCell className="text-right font-medium">
                                      {item.baseSalary ? `${Number(item.baseSalary).toLocaleString()} EGP` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {item.grossSalary ? `${Number(item.grossSalary).toLocaleString()} EGP` : "-"}
                                    </TableCell>
                                  </>
                                )}
                                
                                {(activeTab === "payTypes" || activeTab === "allowances" || 
                                  activeTab === "signingBonuses" || activeTab === "terminationBenefits") && (
                                  <TableCell className="text-right font-medium">
                                    {item.amount ? `${Number(item.amount).toLocaleString()} EGP` : "-"}
                                  </TableCell>
                                )}
                                
                                <TableCell>
                                  {getStatusBadge(item.status)}
                                </TableCell>
                                
                                <TableCell className="text-sm text-muted-foreground">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => viewItem(item)}
                                      title="View details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    
                                    {item.status === ConfigStatus.DRAFT && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => beginEdit(item)}
                                          title="Edit"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => approve(item.id)}
                                          title="Approve"
                                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => reject(item.id)}
                                          title="Reject"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteItem(item.id)}
                                      title="Delete"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

         
        {/* Statistics Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Configuration Statistics
            </CardTitle>
            <CardDescription>
              Overview of all payroll configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const tabItems = items.filter(item => 
                  items.some(i => i.id) // Simplified filter
                );
                const draftCount = tabItems.filter(i => i.status === ConfigStatus.DRAFT).length;
                
                return (
                  <Card key={tab.id} className="border-0 bg-gradient-to-br from-background to-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${tab.bgColor}`}>
                          <Icon className={`h-5 w-5 ${tab.color}`} />
                        </div>
                        {draftCount > 0 && (
                          <Badge variant="destructive" className="animate-pulse">
                            {draftCount} pending
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mt-3">{tab.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tabItems.length} total configurations
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Modal */}
      <Dialog open={!!view} onOpenChange={(open) => !open && closeView()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Configuration Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this configuration
            </DialogDescription>
          </DialogHeader>
          
          {view && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {view.name || view.grade || view.title || 'Unnamed Configuration'}
                  </h3>
                  <p className="text-sm text-muted-foreground">ID: {view.id}</p>
                </div>
                {getStatusBadge(view.status)}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Created Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {view.createdAt ? new Date(view.createdAt).toLocaleDateString() : 'Not available'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Configuration Type</Label>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {tabs.find(t => t.id === activeTab)?.label}
                    </span>
                  </div>
                </div>

                {/* Type-specific fields */}
                {view.baseSalary && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Base Salary</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {Number(view.baseSalary).toLocaleString()} EGP
                      </span>
                    </div>
                  </div>
                )}

                {view.grossSalary && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Gross Salary</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {Number(view.grossSalary).toLocaleString()} EGP
                      </span>
                    </div>
                  </div>
                )}

                {view.amount && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {Number(view.amount).toLocaleString()} EGP
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {view.description && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {view.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeView}>
              Close
            </Button>
            {view?.status === ConfigStatus.DRAFT && (
              <Button onClick={() => {
                beginEdit(view);
                closeView();
              }}>
                Edit Configuration
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  
  );
} 