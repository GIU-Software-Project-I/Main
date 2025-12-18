'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
} from '@/app/services/offboarding';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  FileX,
  AlertTriangle,
  LogOut,
  UserMinus,
  ClipboardCheck,
  DollarSign,
  Search,
  Filter,
  ArrowRight,
  MoreHorizontal,
  Calendar
} from 'lucide-react';

export default function OffboardingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | TerminationStatus>('all');
  const [filterType, setFilterType] = useState<'all' | 'resignations' | 'terminations'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getAllTerminationRequests();
      setRequests(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('Failed to fetch offboarding data:', err);
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setRequests([]);
      } else {
        setError(err.message || 'Failed to fetch offboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to normalize status/initiator for case-insensitive comparison
  const normalizeValue = (val: string) => val?.toLowerCase?.() || val;

  const filteredRequests = requests.filter((request) => {
    const requestStatus = normalizeValue(request.status);
    const requestInitiator = normalizeValue(request.initiator);

    if (filterStatus !== 'all' && requestStatus !== normalizeValue(filterStatus)) return false;
    if (filterType === 'resignations' && requestInitiator !== normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    if (filterType === 'terminations' && requestInitiator === normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.PENDING)).length,
    underReview: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.UNDER_REVIEW)).length,
    approved: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.APPROVED)).length,
    resignations: requests.filter((r) => normalizeValue(r.initiator) === normalizeValue(TerminationInitiation.EMPLOYEE)).length,
    terminations: requests.filter((r) => normalizeValue(r.initiator) !== normalizeValue(TerminationInitiation.EMPLOYEE)).length,
  };

  const getInitiatorLabel = (initiator: TerminationInitiation) => {
    switch (initiator) {
      case TerminationInitiation.EMPLOYEE:
        return 'Resignation';
      case TerminationInitiation.HR:
        return 'HR Initiated';
      case TerminationInitiation.MANAGER:
        return 'Manager Initiated';
      default:
        return initiator;
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-muted/50 rounded-lg w-1/3 animate-pulse"></div>
          <div className="h-10 bg-muted/50 rounded-lg w-1/4 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-muted/20 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/50 relative">
      <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-b from-orange-500/5 to-transparent -z-10 pointer-events-none"></div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Offboarding Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage separations, resignations and exit processes efficiently.
            </p>
          </div>
          <Button size="lg" className="shadow-lg shadow-orange-500/20 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transition-all hover:scale-105" asChild>
            <Link href="/dashboard/hr-manager/offboarding/termination-reviews">
              <UserMinus className="w-5 h-5 mr-2" />
              Initiate Termination
            </Link>
          </Button>
        </div>

        {error && (
          <GlassCard className=" border-destructive/20 bg-destructive/5 text-destructive p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData} className="hover:bg-destructive/10">Retry</Button>
          </GlassCard>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard variant="hover" className="p-6 relative overflow-hidden group border-l-4 border-l-muted">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileX className="w-16 h-16 text-foreground" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Requests</p>
              <p className="text-4xl font-bold text-foreground">{stats.total}</p>
            </div>
          </GlassCard>

          <GlassCard variant="hover" className="p-6 relative overflow-hidden group border-l-4 border-l-amber-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle className="w-16 h-16 text-amber-500" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Review</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">{stats.pending + stats.underReview}</p>
                <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Needing Attention</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="hover" className="p-6 relative overflow-hidden group border-l-4 border-l-blue-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <LogOut className="w-16 h-16 text-blue-500" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Resignations</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.resignations}</p>
                <span className="text-xs text-muted-foreground">Voluntary</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="hover" className="p-6 relative overflow-hidden group border-l-4 border-l-orange-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserMinus className="w-16 h-16 text-orange-500" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Terminations</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{stats.terminations}</p>
                <span className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">Involuntary</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { href: '/dashboard/hr-manager/offboarding/resignations', icon: LogOut, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600', title: 'Resignations', desc: 'Review employee resignations' },
            { href: '/dashboard/hr-manager/offboarding/termination-reviews', icon: AlertTriangle, bg: 'bg-orange-50 dark:bg-orange-900/20', color: 'text-orange-600', title: 'Terminations', desc: 'Initiate termination reviews' },
            { href: '/dashboard/hr-manager/offboarding/checklist', icon: ClipboardCheck, bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600', title: 'Exit Clearance', desc: 'Department sign-offs' },
            { href: '/dashboard/hr-manager/offboarding/final-settlement', icon: DollarSign, bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600', title: 'Final Settlement', desc: 'Process final payments' }
          ].map((item, i) => (
            <Link key={i} href={item.href}>
              <GlassCard className="p-5 flex items-start gap-4 hover:bg-accent/50 transition-colors h-full group hover:border-primary/30">
                <div className={`p-3 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {/* Filters & List */}
        <div className="space-y-6">
          <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent border border-border rounded-md text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-auto"
              >
                <option value="all">All Types</option>
                <option value="resignations">Resignations</option>
                <option value="terminations">Terminations</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-transparent border border-border rounded-md text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-auto"
              >
                <option value="all">All Status</option>
                <option value={TerminationStatus.PENDING}>Pending</option>
                <option value={TerminationStatus.UNDER_REVIEW}>Under Review</option>
                <option value={TerminationStatus.APPROVED}>Approved</option>
                <option value={TerminationStatus.REJECTED}>Rejected</option>
              </select>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search requests..."
                className="w-full pl-9 pr-4 py-1.5 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
              <h2 className="font-semibold text-foreground">Detailed Requests</h2>
            </div>

            <div className="divide-y divide-border/50">
              {filteredRequests.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <FileX className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-xl font-medium text-foreground">No requests found</p>
                  <p className="text-muted-foreground mt-2 max-w-sm">No termination or resignation requests match your current filters.</p>
                  <Button variant="ghost" className="mt-6" onClick={() => { setFilterType('all'); setFilterStatus('all'); }}>Reset Filters</Button>
                </div>
              ) : (
                filteredRequests.map((request) => {
                  const employee = typeof request.employeeId === 'object' ? request.employeeId as any : null;
                  const employeeName = employee
                    ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
                    : 'Employee';
                  const isResignation = request.initiator === TerminationInitiation.EMPLOYEE;
                  return (
                    <Link
                      key={request._id}
                      href={`/dashboard/hr-manager/offboarding/resignations/${request._id}`}
                      className="block hover:bg-accent/40 transition-all duration-200 group"
                    >
                      <div className="px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${isResignation ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600'}`}>
                            {isResignation ? <LogOut className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">{employeeName}</h3>
                              <StatusBadge status={request.status} />
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5 font-medium">
                                {isResignation ? <LogOut className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                                {getInitiatorLabel(request.initiator)}
                              </span>
                              <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                              <span className="italic max-w-md truncate">"{request.reason}"</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                          {request.terminationDate && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              Effective: {new Date(request.terminationDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
