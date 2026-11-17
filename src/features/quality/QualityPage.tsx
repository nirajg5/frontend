import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { qualityApi } from '../../services/api/qualityApi';
import { QualityCheckResult } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useConfig } from '../../context/ConfigContext';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  AlertCircle,
  Database,
} from 'lucide-react';

export const QualityPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();

  const [datasetType, setDatasetType] = useState<string>(
    searchParams.get('dataset_type') || 'customers'
  );
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<string>('all');
  const [result, setResult] = useState<QualityCheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await qualityApi.runQualityCheck(datasetType);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      const passed = data.overall_status?.toUpperCase() === 'PASS' || data.failed_checks === 0;
      addToast({
        type: passed ? 'success' : 'warning',
        title: `Quality Check Complete (${data.dataset})`,
        message: `Status: ${data.overall_status} — ${data.checks_run} checks run, ${data.failed_checks} failed.`,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'Quality Check Failed',
        message: err.message,
      });
    },
  });

  const filteredChecks =
    result?.results?.filter((chk) => {
      if (selectedRuleFilter === 'all') return true;
      const st = String(chk.status).toUpperCase();
      return selectedRuleFilter === 'PASS' ? st === 'PASS' : st !== 'PASS';
    }) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Data Quality Monitoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute backend quality checks against Silver tables (POST /quality/check/{'{dataset_type}'})
        </p>
      </div>

      {/* Trigger Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Run Quality Check</CardTitle>
            <p className="text-xs text-slate-500">
              Supported dataset types: customers, products, orders (no JSON body required)
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-80">
              <Select
                label="Dataset Type"
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value)}
              >
                <option value="customers">customers (silver_customers)</option>
                <option value="products">products (silver_products)</option>
                <option value="orders">orders (silver_orders)</option>
              </Select>
            </div>

            <div className="pt-5 sm:ml-auto">
              <Button
                variant="primary"
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate()}
                leftIcon={<Play className="w-4 h-4" />}
              >
                Run Quality Check
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Overall Status"
              value={result.overall_status}
              subtitle={`Table: ${result.table}`}
              status={result.overall_status?.toUpperCase() === 'PASS' ? 'healthy' : 'critical'}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <StatCard
              title="Rows Checked"
              value={result.rows_checked.toLocaleString()}
              subtitle={`Dataset: ${result.dataset}`}
              icon={<Database className="w-4 h-4" />}
            />
            <StatCard
              title="Checks Run"
              value={result.checks_run}
              icon={<Sparkles className="w-4 h-4" />}
            />
            <StatCard
              title="Failed Checks"
              value={result.failed_checks}
              status={result.failed_checks > 0 ? 'critical' : 'healthy'}
              icon={result.failed_checks > 0 ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Individual Check Results</CardTitle>
                <p className="text-xs text-slate-500">
                  Table: {result.table} | Rows Checked: {result.rows_checked.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Filter:</span>
                {['all', 'PASS', 'FAIL'].map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setSelectedRuleFilter(flt)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      selectedRuleFilter === flt
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {flt === 'all' ? 'All' : flt}
                  </button>
                ))}
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Check Name</th>
                    <th className="px-5 py-3.5">Column</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Failed Rows</th>
                    <th className="px-5 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChecks.map((chk, i) => {
                    const isPass = String(chk.status).toUpperCase() === 'PASS' || chk.passed === true;
                    return (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-medium text-slate-900">
                          {chk.check_name || chk.rule_name || chk.name || `Check #${i + 1}`}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-indigo-600">
                          {chk.column || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={isPass ? 'healthy' : 'failing'} size="sm" dot>
                            {String(chk.status || (isPass ? 'PASS' : 'FAIL')).toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-800">
                          {chk.failed_rows !== undefined ? chk.failed_rows.toLocaleString() : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {chk.details || chk.message || '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredChecks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        No check results match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No Quality Check Run Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Select customers, products, or orders and click "Run Quality Check".
          </p>
        </div>
      )}
    </div>
  );
};
