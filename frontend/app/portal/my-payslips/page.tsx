'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiService from '@/app/services/api';

interface Payslip {
  _id: string;
  payPeriod: string;
  payDate: string;
  grossSalary: number;
  netSalary: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  insurance: number;
  status: 'DRAFT' | 'PROCESSED' | 'PAID';
}

export default function MyPayslipsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [latestPayslip, setLatestPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    fetchPayslips();
  }, [selectedYear]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(`/payroll/my-payslips?year=${selectedYear}`);
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setPayslips(data);
        if (data.length > 0) {
          setLatestPayslip(data[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' };
      case 'PROCESSED':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processed' };
      case 'DRAFT':
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Calculate YTD totals
  const ytdTotals = payslips.reduce(
    (acc, p) => ({
      gross: acc.gross + (p.grossSalary || 0),
      net: acc.net + (p.netSalary || 0),
      tax: acc.tax + (p.tax || 0),
      deductions: acc.deductions + (p.deductions || 0),
    }),
    { gross: 0, net: 0, tax: 0, deductions: 0 }
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-48 bg-white rounded-xl shadow-sm"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white rounded-xl shadow-sm"></div>
              ))}
            </div>
            <div className="h-64 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">My Payslips</h1>
            <p className="text-gray-500 mt-1">View and download your salary statements</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Link
              href="/portal/my-payslips/tax-summary"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Tax Summary
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Latest Payslip Card */}
        {latestPayslip && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <p className="text-green-100 text-sm">Latest Payslip</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(latestPayslip.netSalary)}</p>
                <p className="text-green-100 mt-1">
                  {latestPayslip.payPeriod} | Paid on {new Date(latestPayslip.payDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="bg-white/10 rounded-lg px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <p className="text-green-200">Gross</p>
                      <p className="font-semibold">{formatCurrency(latestPayslip.grossSalary)}</p>
                    </div>
                    <div>
                      <p className="text-green-200">Deductions</p>
                      <p className="font-semibold">-{formatCurrency(latestPayslip.deductions)}</p>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/portal/my-payslips/${latestPayslip._id}`}
                  className="px-5 py-2.5 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* YTD Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            title="YTD Gross"
            value={formatCurrency(ytdTotals.gross)}
            icon="dollar"
            color="blue"
          />
          <SummaryCard
            title="YTD Net"
            value={formatCurrency(ytdTotals.net)}
            icon="wallet"
            color="green"
          />
          <SummaryCard
            title="YTD Tax"
            value={formatCurrency(ytdTotals.tax)}
            icon="receipt"
            color="amber"
          />
          <SummaryCard
            title="YTD Deductions"
            value={formatCurrency(ytdTotals.deductions)}
            icon="minus"
            color="red"
          />
        </div>

        {/* Payslips List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Payslip History - {selectedYear}</h2>
          </div>

          {payslips.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No payslips found for {selectedYear}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pay Period</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pay Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Deductions</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payslips.map((payslip) => {
                    const statusConfig = getStatusConfig(payslip.status);
                    return (
                      <tr key={payslip._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{payslip.payPeriod}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(payslip.payDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(payslip.grossSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                          -{formatCurrency(payslip.deductions)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">
                          {formatCurrency(payslip.netSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/portal/my-payslips/${payslip._id}`}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => window.print()}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Salary Breakdown Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Typical Earnings
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Salary</span>
                <span className="font-medium text-gray-900">Monthly fixed amount</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Allowances</span>
                <span className="font-medium text-gray-900">Housing, Transport, etc.</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overtime</span>
                <span className="font-medium text-gray-900">Based on extra hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bonuses</span>
                <span className="font-medium text-gray-900">Performance-based</span>
              </div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Typical Deductions
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Income Tax</span>
                <span className="font-medium text-gray-900">Per tax brackets</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Social Insurance</span>
                <span className="font-medium text-gray-900">Employee contribution</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Health Insurance</span>
                <span className="font-medium text-gray-900">Medical coverage</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Other Deductions</span>
                <span className="font-medium text-gray-900">Loans, advances, etc.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Questions About Your Payslip?</h3>
              <p className="text-gray-600 mt-1 text-sm">
                If you notice any discrepancies in your payslip or have questions about deductions,
                please contact the Payroll department or submit a query through HR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
  };

  const colors = colorClasses[color];

  const getIcon = () => {
    switch (icon) {
      case 'dollar':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'wallet':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      case 'receipt':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>;
      case 'minus':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center ${colors.text}`}>
          {getIcon()}
        </div>
      </div>
    </div>
  );
}

