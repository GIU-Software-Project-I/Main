'use client';

import { useState } from 'react';
import { payrollExecutionService } from '@/app/services/payroll-execution';

export default function GeneratePayslipsPage() {
  const [runId, setRunId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await payrollExecutionService.generatePayslips(runId);
      if (res.error) return setError(res.error);
      setStatus('Payslips generated');
    } catch (e: any) {
      setError(e?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Generate Payslips</h1>
      <div className="space-y-2">
        <label className="block text-sm">Payroll Run ID</label>
        <input className="border p-2 w-full" value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="Enter payroll run id" />
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading || !runId} onClick={handleGenerate}>
        {loading ? 'Generating…' : 'Generate'}
      </button>
      {status && <p className="text-green-700">{status}</p>}
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
