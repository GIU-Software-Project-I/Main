'use client';

export default function HREmployeePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">HR Employee Dashboard</h1>
        <p className="text-muted-foreground mt-2">HR operations and execution</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Pending Tasks</p>
          <p className="text-2xl font-bold text-foreground mt-2">8</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Candidates in Pipeline</p>
          <p className="text-2xl font-bold text-foreground mt-2">34</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Active Job Posts</p>
          <p className="text-2xl font-bold text-foreground mt-2">6</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Scheduled Interviews</p>
          <p className="text-2xl font-bold text-foreground mt-2">12</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">📝</div>
            <p className="font-medium text-foreground">Job Posting</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">👤</div>
            <p className="font-medium text-foreground">Candidates</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">🗓️</div>
            <p className="font-medium text-foreground">Interviews</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">✉️</div>
            <p className="font-medium text-foreground">Offers</p>
          </button>
        </div>
      </div>
    </div>
  );
}

