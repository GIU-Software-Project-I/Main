'use client';

export default function PayrollSpecialistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payroll Specialist Dashboard</h1>
        <p className="text-muted-foreground mt-2">Payroll processing and configuration</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Pending Payroll</p>
          <p className="text-2xl font-bold text-foreground mt-2">2</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Employees Processed</p>
          <p className="text-2xl font-bold text-foreground mt-2">482</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Disputes</p>
          <p className="text-2xl font-bold text-foreground mt-2">4</p>
        </div>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <p className="text-muted-foreground text-sm">Last Run</p>
          <p className="text-2xl font-bold text-foreground mt-2">Dec 5</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <p className="font-medium text-foreground">Configuration</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">💼</div>
            <p className="font-medium text-foreground">Payroll Run</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium text-foreground">Reports</p>
          </button>
          <button className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="font-medium text-foreground">Disputes</p>
          </button>
        </div>
      </div>
    </div>
  );
}

