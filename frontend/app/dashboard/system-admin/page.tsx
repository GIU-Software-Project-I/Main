'use client';

import Link from 'next/link';

export default function SystemAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">System-wide configuration and management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">System Uptime</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">99.9%</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Active Users</p>
          <p className="text-2xl font-bold text-foreground mt-2">145</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Backup Status</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">OK</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Alerts</p>
          <p className="text-2xl font-bold text-foreground mt-2">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/system-admin/organization">
            <button className="w-full p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
              <div className="text-2xl mb-2">🏢</div>
              <p className="font-medium text-foreground">Organization</p>
              <p className="text-xs text-muted-foreground mt-1">View structure</p>
            </button>
          </Link>
          <Link href="/dashboard/system-admin/departments">
            <button className="w-full p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
              <div className="text-2xl mb-2">🏛️</div>
              <p className="font-medium text-foreground">Departments</p>
              <p className="text-xs text-muted-foreground mt-1">Manage departments</p>
            </button>
          </Link>
          <Link href="/dashboard/system-admin/positions">
            <button className="w-full p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
              <div className="text-2xl mb-2">💼</div>
              <p className="font-medium text-foreground">Positions</p>
              <p className="text-xs text-muted-foreground mt-1">Manage positions</p>
            </button>
          </Link>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">🔧</div>
            <p className="font-medium text-foreground">Maintenance</p>
            <p className="text-xs text-muted-foreground mt-1">System tools</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent System Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-foreground">System backup completed successfully</span>
            <span className="text-xs text-muted-foreground ml-auto">2 hours ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-foreground">New department created: Marketing</span>
            <span className="text-xs text-muted-foreground ml-auto">5 hours ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-foreground">Position updated: Senior Developer</span>
            <span className="text-xs text-muted-foreground ml-auto">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

