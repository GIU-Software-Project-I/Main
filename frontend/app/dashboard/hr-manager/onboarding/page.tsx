'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Users,
  CheckSquare,
  Clock,
  CheckCircle2,
  Plus,
  FileText,
  DollarSign,
  Bell,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';

export default function OnboardingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setOnboardings([]);
      } else {
        setError(err.message || 'Failed to fetch onboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOnboardings = onboardings.filter((onboarding) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return onboarding.completed;
    if (filterStatus === 'in_progress') return !onboarding.completed;
    return true;
  });

  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter((o) => !o.completed).length,
    completed: onboardings.filter((o) => o.completed).length,
    pendingTasks: onboardings.reduce(
      (acc, o) => acc + (o.tasks?.filter((t) => t.status === OnboardingTaskStatus.PENDING).length || 0),
      0
    ),
  };

  const calculateProgress = (tasks: Onboarding['tasks']) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
    if (progress >= 50) return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
    if (progress >= 25) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
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
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none"></div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Onboarding Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Streamline the new hire experience and track progress.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="h-10 gap-2 hover:bg-background/80 hover:scale-105 transition-all" asChild>
              <Link href="/dashboard/hr-manager/onboarding/employee">
                <Plus className="w-4 h-4 text-primary" />
                <span>Create Employee</span>
              </Link>
            </Button>
            <Button className="h-10 gap-2 bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/20 transition-all hover:scale-105" asChild>
              <Link href="/dashboard/hr-manager/onboarding/checklists">
                <CheckSquare className="w-4 h-4" />
                <span>Manage Checklists</span>
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <GlassCard className=" border-destructive/20 bg-destructive/5 text-destructive p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold">!</span>
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData} className="hover:bg-destructive/10">Retry</Button>
          </GlassCard>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard variant="hover" className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-16 h-16 text-primary" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Onboardings</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-foreground">{stats.total}</p>
                <span className="text-xs text-green-500 font-medium">+12%</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="hover" className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-16 h-16 text-blue-500" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p>
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="hover" className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
                <span className="text-xs text-muted-foreground">Finished</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="hover" className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Bell className="w-16 h-16 text-amber-500" />
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Tasks</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingTasks}</p>
                <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Action Needed</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              href: '/dashboard/hr-manager/onboarding/checklists',
              icon: CheckSquare,
              color: 'text-primary',
              bg: 'bg-primary/10',
              title: 'Checklists',
              desc: 'Create and manage checklists'
            },
            {
              href: '/dashboard/hr-manager/onboarding/employee',
              icon: Users,
              color: 'text-green-600 dark:text-green-400',
              bg: 'bg-green-500/10',
              title: 'Profile Creation',
              desc: 'From signed contracts'
            },
            {
              href: '/dashboard/hr-manager/onboarding/payroll',
              icon: DollarSign,
              color: 'text-purple-600 dark:text-purple-400',
              bg: 'bg-purple-500/10',
              title: 'Payroll Setup',
              desc: 'Initiate payroll & bonuses'
            },
            {
              href: '#',
              icon: Bell,
              color: 'text-orange-600 dark:text-orange-400',
              bg: 'bg-orange-500/10',
              title: 'Reminders',
              desc: 'Send batch reminders',
              noLink: true
            },
          ].map((item, i) => (
            item.noLink ? (
              <GlassCard key={i} className="p-5 flex items-start gap-4 hover:bg-accent/50 transition-colors cursor-pointer">
                <div className={`p-3 rounded-xl ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </GlassCard>
            ) : (
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
            )
          ))}
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/30 p-2 rounded-lg backdrop-blur-sm border border-border/50">
            <div className="flex p-1 bg-muted/50 rounded-lg">
              {[
                { label: 'All', value: 'all' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Completed', value: 'completed' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${filterStatus === filter.value
                      ? 'bg-background shadow-sm text-foreground scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employees..."
                className="pl-9 pr-4 py-2 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64"
              />
            </div>
          </div>

          <GlassCard className="overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                Active Onboardings
                <Badge variant="secondary" className="ml-2 text-xs">{filteredOnboardings.length}</Badge>
              </h2>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter
              </Button>
            </div>

            <div className="divide-y divide-border/40">
              {filteredOnboardings.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Users className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-xl font-medium text-foreground">No onboardings found</p>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    There are currently no active onboarding processes matching your criteria.
                  </p>
                  <Button variant="outline" className="mt-6" onClick={() => setFilterStatus('all')}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                filteredOnboardings.map((onboarding) => {
                  const progress = calculateProgress(onboarding.tasks);
                  const employee = typeof onboarding.employeeId === 'object' ? onboarding.employeeId as any : null;
                  const employeeName = employee
                    ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'New Hire'
                    : 'New Hire';

                  return (
                    <div key={onboarding._id} className="group hover:bg-accent/40 transition-colors p-6 relative">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${onboarding.completed
                            ? 'bg-green-500/10 ring-1 ring-green-500/20'
                            : 'bg-primary/10 ring-1 ring-primary/20'
                            }`}>
                            {onboarding.completed ? (
                              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <Users className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <Link href={`/dashboard/hr-manager/onboarding/checklists/${onboarding._id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                                {employeeName}
                              </Link>
                              <Badge variant={onboarding.completed ? 'default' : 'outline'} className={onboarding.completed ? 'bg-green-600' : 'border-primary/50 text-foreground'}>
                                {onboarding.completed ? 'Completed' : 'In Progress'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              Started: {new Date(onboarding.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8 w-full sm:w-auto">
                          <div className="flex-1 sm:w-64 space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                              <span>Progress</span>
                              <span className={onboarding.completed ? 'text-green-500' : 'text-primary'}>{progress}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressColor(progress)}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              {onboarding.tasks?.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length || 0} of {onboarding.tasks?.length || 0} tasks completed
                            </div>
                          </div>

                          <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform" asChild>
                            <Link href={`/dashboard/hr-manager/onboarding/checklists/${onboarding._id}`}>
                              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
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
