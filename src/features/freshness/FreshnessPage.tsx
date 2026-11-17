import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { freshnessApi } from '../../services/api/freshnessApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { FreshnessResult } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/StatCard';
import { useConfig } from '../../context/ConfigContext';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Calendar,
  Zap,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_DATASETS = ['bronze_customers', 'bronze_products', 'bronze_orders'];

export const FreshnessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const registeredNames = (datasetsData?.data || []).map((d) => d.dataset_name);
  const availableDatasets = registeredNames.length > 0 ? registeredNames : DEFAULT_DATASETS;

  const [datasetName, setDatasetName] = useState<string>(
    searchParams.get('dataset_name') || availableDatasets[0]
  );

  useEffect(() => {
    const param = searchParams.get('dataset_name');
    if (param) setDatasetName(param);
  }, [searchParams]);

  const [result, setResult] = useState<FreshnessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await freshnessApi.checkFreshness(datasetName);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      const isFresh = data.freshness_status?.toUpperCase() === 'FRESH';
      addToast({
        type: isFresh ? 'success' : 'warning',
        title: `Freshness Check Complete: ${data.dataset_name}`,
        message: `Status: ${data.freshness_status} (Score: ${data.freshness_score}, Age: ${data.age_hours ?? 'N/A'}h / SLA: ${data.sla_hours}h)`,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'Freshness Check Failed',
        message: err.message,
      });
    },
  });

  const isFresh = result?.freshness_status?.toUpperCase() === 'FRESH';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Freshness &amp; SLAs</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Check dataset update age against backend SLA hours (POST /freshness/check/{'{dataset_name}'})
        </p>
      </div>

      {/* SLA Form Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Check Dataset Freshness</CardTitle>
            <p className="text-xs text-slate-500">
              Supported datasets: bronze_customers, bronze_products, bronze_orders
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
                label="Target Dataset"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              >
                {availableDatasets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="pt-5 sm:ml-auto">
              <Button
                variant="primary"
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate()}
                leftIcon={<Play className="w-4 h-4" />}
              >
                Check Freshness
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Freshness Result Display */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Freshness Status"
              value={result.freshness_status}
              subtitle={`Dataset: ${result.dataset_name}`}
              status={isFresh ? 'healthy' : 'critical'}
              icon={<Clock className="w-4 h-4" />}
            />
            <StatCard
              title="Freshness Score"
              value={result.freshness_score}
              subtitle="0 - 100 SLA score"
              status={result.freshness_score >= 80 ? 'healthy' : 'warning'}
              icon={<Zap className="w-4 h-4" />}
            />
            <StatCard
              title="Dataset Age"
              value={result.age_hours !== null && result.age_hours !== undefined ? `${result.age_hours} hrs` : '—'}
              subtitle={`SLA Limit: ${result.sla_hours} hrs`}
              icon={<Calendar className="w-4 h-4" />}
            />
            <StatCard
              title="SLA Threshold"
              value={`${result.sla_hours} hrs`}
              subtitle="Configured SLA window"
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Freshness Timestamp Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div
                className={`p-4 rounded-xl border ${
                  isFresh
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                  {isFresh ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>
                    {result.dataset_name}: {result.freshness_status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Actual Update Time</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {result.actual_update_time ? new Date(result.actual_update_time).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Expected Update Time</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {result.expected_update_time ? new Date(result.expected_update_time).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Checked At</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {new Date(result.checked_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No Freshness Check Executed</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Choose a registered dataset above and click "Check Freshness".
          </p>
        </div>
      )}
    </div>
  );
};
