'use client';

export default function JobCandidatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Job Candidate Portal</h1>
        <p className="text-muted-foreground mt-2">Track your applications and status</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Applications</p>
          <p className="text-2xl font-bold text-foreground mt-2">3</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Under Review</p>
          <p className="text-2xl font-bold text-foreground mt-2">1</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Interview Scheduled</p>
          <p className="text-2xl font-bold text-foreground mt-2">1</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Status</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">Active</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">💼</div>
            <p className="font-medium text-foreground">Browse Jobs</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">📋</div>
            <p className="font-medium text-foreground">My Applications</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">👤</div>
            <p className="font-medium text-foreground">My Profile</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="font-medium text-foreground">Messages</p>
          </button>
        </div>
      </div>
    </div>
  );
}

