'use client';

export default function FinanceStaffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Finance Staff Dashboard</h1>
        <p className="text-muted-foreground mt-2">Payroll review and financial management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Monthly Payroll</p>
          <p className="text-2xl font-bold text-foreground mt-2">$2.4M</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Pending Reviews</p>
          <p className="text-2xl font-bold text-foreground mt-2">2</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Budget Variance</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">+2.3%</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Reconciliation</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">Complete</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium text-foreground">Payroll Review</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">💰</div>
            <p className="font-medium text-foreground">Budget</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">✅</div>
            <p className="font-medium text-foreground">Reconciliation</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">📈</div>
            <p className="font-medium text-foreground">Analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
}

