import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { predictionsApi } from '../../services/api/predictionsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { FailurePredictionRequest, PredictionResultResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useConfig } from '../../context/ConfigContext';
import {
  TrendingDown,
  Activity,
  AlertTriangle,
  Play,
  RotateCcw,
  BarChart2,
  ShieldCheck,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const failurePredictionSchema = z.object({
  pipeline_name: z.string().trim().min(1, 'Pipeline name is required'),
  pipeline_run_id: z.union([z.number().int().nonnegative(), z.null()]),
  hour_of_day: z.number().int().min(0).max(23),
  day_of_week: z.number().int().min(0).max(6),
  expected_rows: z.number().int().min(0),
  source_freshness_lag_minutes: z.number().min(0),
  upstream_failures_24h: z.number().int().min(0),
  failures_last_10_runs: z.number().int().min(0).max(10),
  success_streak_before_run: z.number().int().min(0),
  schema_change_detected: z.number().int().min(0).max(1),
  null_rate_last_run: z.number().min(0).max(1),
  duplicate_rate_last_run: z.number().min(0).max(1),
  volume_change_pct_vs_7d_avg: z.number(),
  cpu_utilization_pct: z.number().min(0).max(100),
  memory_utilization_pct: z.number().min(0).max(100),
  concurrent_pipelines: z.number().int().min(0),
  is_weekend: z.number().int().min(0).max(1),
});

interface PredictionFormValues {
  pipeline_name: string;
  pipeline_run_id: string;
  hour_of_day: number;
  day_of_week: number;
  expected_rows: number;
  source_freshness_lag_minutes: number;
  upstream_failures_24h: number;
  failures_last_10_runs: number;
  success_streak_before_run: number;
  schema_change_detected: number;
  null_rate_last_run: number;
  duplicate_rate_last_run: number;
  volume_change_pct_vs_7d_avg: number;
  cpu_utilization_pct: number;
  memory_utilization_pct: number;
  concurrent_pipelines: number;
  is_weekend: number;
}

const ILLUSTRATIVE_DEFAULTS: PredictionFormValues = {
  pipeline_name: 'bronze_csv_ingestion',
  pipeline_run_id: '',
  hour_of_day: 14,
  day_of_week: 2,
  expected_rows: 1000,
  source_freshness_lag_minutes: 30,
  upstream_failures_24h: 0,
  failures_last_10_runs: 0,
  success_streak_before_run: 5,
  schema_change_detected: 0,
  null_rate_last_run: 0.01,
  duplicate_rate_last_run: 0.02,
  volume_change_pct_vs_7d_avg: 0.05,
  cpu_utilization_pct: 45,
  memory_utilization_pct: 60,
  concurrent_pipelines: 2,
  is_weekend: 0,
};

export const PredictionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast, demoMode } = useConfig();
  const queryDataset = searchParams.get('dataset_name');

  const [activeTab, setActiveTab] = useState<'predict' | 'evaluation'>('predict');
  const [selectedDataset, setSelectedDataset] = useState<string>(queryDataset || 'bronze_orders');
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResultResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PredictionFormValues>({
    defaultValues: ILLUSTRATIVE_DEFAULTS,
  });

  // Queries
  const {
    data: modelStatusData,
    isLoading: modelStatusLoading,
    error: modelStatusError,
  } = useQuery({
    queryKey: ['predictionModelStatus', demoMode],
    queryFn: () => predictionsApi.getModelStatus(),
    retry: 0,
  });

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList', demoMode],
    queryFn: () => datasetsApi.getDatasets(),
    retry: 0,
  });

  const registeredDatasets = datasetsData?.data || [];

  useEffect(() => {
    if (!queryDataset && registeredDatasets.length > 0) {
      const exists = registeredDatasets.some((d) => d.dataset_name === selectedDataset);
      if (!exists) {
        setSelectedDataset(registeredDatasets[0].dataset_name);
      }
    }
  }, [queryDataset, registeredDatasets, selectedDataset]);

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['predictionHistory', selectedDataset, demoMode],
    queryFn: () => predictionsApi.getPredictionHistory(selectedDataset),
    enabled: Boolean(selectedDataset),
    retry: 0,
  });

  const {
    data: evalData,
    isLoading: evalLoading,
    error: evalError,
    refetch: refetchEvaluation,
  } = useQuery({
    queryKey: ['modelEvaluation', demoMode],
    queryFn: () => predictionsApi.getEvaluation(),
    retry: 0,
  });

  // Mutation: POST /predictions/failure/{dataset_name}
  const predictMutation = useMutation({
    mutationFn: async (payload: FailurePredictionRequest) => {
      const res = await predictionsApi.predictFailure(selectedDataset, payload);
      return res.data;
    },
    onSuccess: (data) => {
      setCurrentPrediction(data);
      refetchHistory();
      const risk = (data.risk_category || data.risk_level || 'UNKNOWN').toUpperCase();
      addToast({
        type: risk === 'LOW' ? 'success' : 'warning',
        title: `Failure Prediction Generated for ${data.dataset_name || selectedDataset}`,
        message: `Failure Probability: ${(data.failure_probability * 100).toFixed(1)}% (Risk: ${risk}).`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Prediction Request Failed',
        message: err.message,
      });
    },
  });

  const onSubmit = (values: PredictionFormValues) => {
    setValidationError(null);
    const trimmedRunId = String(values.pipeline_run_id ?? '').trim();
    const candidatePayload: FailurePredictionRequest = {
      pipeline_name: values.pipeline_name,
      pipeline_run_id: trimmedRunId === '' ? null : Number(trimmedRunId),
      hour_of_day: Number(values.hour_of_day),
      day_of_week: Number(values.day_of_week),
      expected_rows: Number(values.expected_rows),
      source_freshness_lag_minutes: Number(values.source_freshness_lag_minutes),
      upstream_failures_24h: Number(values.upstream_failures_24h),
      failures_last_10_runs: Number(values.failures_last_10_runs),
      success_streak_before_run: Number(values.success_streak_before_run),
      schema_change_detected: Number(values.schema_change_detected),
      null_rate_last_run: Number(values.null_rate_last_run),
      duplicate_rate_last_run: Number(values.duplicate_rate_last_run),
      volume_change_pct_vs_7d_avg: Number(values.volume_change_pct_vs_7d_avg),
      cpu_utilization_pct: Number(values.cpu_utilization_pct),
      memory_utilization_pct: Number(values.memory_utilization_pct),
      concurrent_pipelines: Number(values.concurrent_pipelines),
      is_weekend: Number(values.is_weekend),
    };

    const parsed = failurePredictionSchema.safeParse(candidatePayload);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      setValidationError(msg);
      return;
    }

    predictMutation.mutate(parsed.data);
  };

  const modelStatus = modelStatusData?.data;
  const evaluation = evalData?.data;
  const history = historyData?.data || [];

  const datasetOptions = useMemo(() => {
    if (registeredDatasets.length > 0) {
      const names = registeredDatasets.map((d) => ({
        value: d.dataset_name,
        label: `${d.dataset_name} (${d.source_type})`,
      }));
      if (selectedDataset && !names.some((n) => n.value === selectedDataset)) {
        return [{ value: selectedDataset, label: selectedDataset }, ...names];
      }
      return names;
    }
    return [
      { value: 'bronze_orders', label: 'bronze_orders' },
      { value: 'bronze_customers', label: 'bronze_customers' },
      { value: 'bronze_products', label: 'bronze_products' },
    ];
  }, [registeredDatasets, selectedDataset]);

  const getRiskBadge = (level?: string) => {
    const normalized = (level || 'UNKNOWN').toUpperCase();
    switch (normalized) {
      case 'CRITICAL':
        return <Badge variant="critical">CRITICAL RISK</Badge>;
      case 'HIGH':
        return <Badge variant="high">HIGH RISK</Badge>;
      case 'MEDIUM':
        return <Badge variant="medium">MEDIUM RISK</Badge>;
      case 'LOW':
        return <Badge variant="healthy">LOW RISK</Badge>;
      default:
        return <Badge variant="neutral">{normalized}</Badge>;
    }
  };

  // Normalize confusion matrix from either object or 2D array
  const normalizedConfusion = useMemo(() => {
    const cm = evaluation?.confusion_matrix;
    if (!cm) return null;
    if (Array.isArray(cm)) {
      if (cm.length >= 2 && Array.isArray(cm[0]) && Array.isArray(cm[1])) {
        const tn = Number(cm[0][0] ?? 0);
        const fp = Number(cm[0][1] ?? 0);
        const fn = Number(cm[1][0] ?? 0);
        const tp = Number(cm[1][1] ?? 0);
        return { true_negative: tn, false_positive: fp, false_negative: fn, true_positive: tp };
      }
      return null;
    }
    return {
      true_positive: cm.true_positive ?? 0,
      false_positive: cm.false_positive ?? 0,
      true_negative: cm.true_negative ?? 0,
      false_negative: cm.false_negative ?? 0,
    };
  }, [evaluation?.confusion_matrix]);

  // Normalize feature importances from either array or record
  const normalizedFeatureImportances = useMemo(() => {
    const fi = evaluation?.feature_importances;
    if (!fi) return [];
    if (Array.isArray(fi)) {
      return fi;
    }
    return Object.entries(fi)
      .map(([feature, importance]) => ({ feature, importance: Number(importance) }))
      .sort((a, b) => b.importance - a.importance);
  }, [evaluation?.feature_importances]);

  const modelAvailableText = useMemo(() => {
    if (modelStatusLoading) return 'CHECKING...';
    if (modelStatusError) return 'UNAVAILABLE';
    if (!modelStatus) return '—';
    if (modelStatus.status) return String(modelStatus.status).toUpperCase();
    if (typeof modelStatus.model_available === 'boolean') {
      return modelStatus.model_available ? 'AVAILABLE' : 'UNAVAILABLE';
    }
    if (typeof modelStatus.loaded === 'boolean') {
      return modelStatus.loaded ? 'LOADED' : 'NOT LOADED';
    }
    return 'UNKNOWN';
  }, [modelStatus, modelStatusLoading, modelStatusError]);

  const currentRisk = currentPrediction?.risk_category || currentPrediction?.risk_level;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Failure Predictions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ML failure forecasting via <code>POST /predictions/failure/{'{dataset_name}'}</code> and model evaluation metrics
          </p>
        </div>
        {demoMode && <Badge variant="mock">DEMO DATA</Badge>}
      </div>

      {modelStatusError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            Model status check failed:{' '}
            {modelStatusError instanceof Error ? modelStatusError.message : 'Unable to reach prediction service.'}
          </span>
        </div>
      )}

      {/* Model Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Prediction Model"
          value={modelStatus?.model_name || (modelStatusLoading ? '...' : '—')}
          subtitle={`Version: ${modelStatus?.version || modelStatus?.model_version || '—'}`}
          icon={<Activity className="w-4 h-4" />}
          status="neutral"
        />
        <StatCard
          title="Model Operational State"
          value={modelAvailableText}
          subtitle={
            modelStatus?.trained_at
              ? `Trained: ${new Date(modelStatus.trained_at).toLocaleDateString()}`
              : modelStatus?.algorithm
              ? `Algorithm: ${modelStatus.algorithm}`
              : 'GET /predictions/failure/model-status'
          }
          icon={<ShieldCheck className="w-4 h-4" />}
          status={
            modelStatusError
              ? 'critical'
              : modelStatus?.model_available === false
              ? 'warning'
              : modelStatus
              ? 'healthy'
              : 'neutral'
          }
        />
        <StatCard
          title="Expected Feature Count"
          value={modelStatus?.feature_count ?? 17}
          subtitle="FailurePredictionRequest vector"
          icon={<Zap className="w-4 h-4" />}
        />
        <StatCard
          title="Training State"
          value={
            typeof modelStatus?.is_trained === 'boolean'
              ? modelStatus.is_trained
                ? 'TRAINED'
                : 'UNTRAINED'
              : typeof modelStatus?.model_available === 'boolean'
              ? modelStatus.model_available
                ? 'READY'
                : 'MISSING'
              : '—'
          }
          subtitle={demoMode ? 'Demo fixture' : 'Live model artifact'}
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'predict' | 'evaluation')}
        tabs={[
          {
            id: 'predict',
            label: 'Run Risk Inference & History',
            icon: <TrendingDown className="w-4 h-4" />,
          },
          {
            id: 'evaluation',
            label: 'Model Accuracy & Evaluation',
            icon: <BarChart2 className="w-4 h-4" />,
          },
        ]}
      />

      {activeTab === 'predict' ? (
        <div className="space-y-6">
          {/* Inference Trigger Form (Complete 17-field FailurePredictionRequest) */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Generate Pipeline Failure Risk Score</CardTitle>
                <p className="text-xs text-slate-500">
                  Submit all 17 <code>FailurePredictionRequest</code> features to{' '}
                  <code>POST /predictions/failure/{'{dataset_name}'}</code> (inputs prefilled with illustrative defaults)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  reset(ILLUSTRATIVE_DEFAULTS);
                  setValidationError(null);
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset Defaults
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {validationError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </div>
                )}

                {predictMutation.isError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      {predictMutation.error instanceof Error
                        ? predictMutation.error.message
                        : 'Prediction request failed.'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select
                    label="Target Dataset (path param)"
                    value={selectedDataset}
                    onChange={(e) => setSelectedDataset(e.target.value)}
                  >
                    {datasetOptions.map((ds) => (
                      <option key={ds.value} value={ds.value}>
                        {ds.label}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="pipeline_name"
                    {...register('pipeline_name', { required: 'Required' })}
                    error={errors.pipeline_name?.message}
                  />

                  <Input
                    label="pipeline_run_id (optional)"
                    placeholder="null"
                    {...register('pipeline_run_id')}
                  />

                  <Input
                    label="expected_rows"
                    type="number"
                    min={0}
                    {...register('expected_rows', { valueAsNumber: true })}
                  />

                  <Input
                    label="hour_of_day (0-23)"
                    type="number"
                    min={0}
                    max={23}
                    {...register('hour_of_day', { valueAsNumber: true })}
                  />

                  <Input
                    label="day_of_week (0-6)"
                    type="number"
                    min={0}
                    max={6}
                    {...register('day_of_week', { valueAsNumber: true })}
                  />

                  <Select
                    label="is_weekend"
                    {...register('is_weekend', { valueAsNumber: true })}
                  >
                    <option value={0}>0 (Weekday)</option>
                    <option value={1}>1 (Weekend)</option>
                  </Select>

                  <Input
                    label="source_freshness_lag_minutes"
                    type="number"
                    min={0}
                    step="any"
                    {...register('source_freshness_lag_minutes', { valueAsNumber: true })}
                  />

                  <Input
                    label="upstream_failures_24h"
                    type="number"
                    min={0}
                    {...register('upstream_failures_24h', { valueAsNumber: true })}
                  />

                  <Input
                    label="failures_last_10_runs"
                    type="number"
                    min={0}
                    max={10}
                    {...register('failures_last_10_runs', { valueAsNumber: true })}
                  />

                  <Input
                    label="success_streak_before_run"
                    type="number"
                    min={0}
                    {...register('success_streak_before_run', { valueAsNumber: true })}
                  />

                  <Select
                    label="schema_change_detected"
                    {...register('schema_change_detected', { valueAsNumber: true })}
                  >
                    <option value={0}>0 (No change)</option>
                    <option value={1}>1 (Schema changed)</option>
                  </Select>

                  <Input
                    label="null_rate_last_run (0-1)"
                    type="number"
                    min={0}
                    max={1}
                    step="0.001"
                    {...register('null_rate_last_run', { valueAsNumber: true })}
                  />

                  <Input
                    label="duplicate_rate_last_run (0-1)"
                    type="number"
                    min={0}
                    max={1}
                    step="0.001"
                    {...register('duplicate_rate_last_run', { valueAsNumber: true })}
                  />

                  <Input
                    label="volume_change_pct_vs_7d_avg"
                    type="number"
                    step="0.001"
                    {...register('volume_change_pct_vs_7d_avg', { valueAsNumber: true })}
                  />

                  <Input
                    label="cpu_utilization_pct (0-100)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    {...register('cpu_utilization_pct', { valueAsNumber: true })}
                  />

                  <Input
                    label="memory_utilization_pct (0-100)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    {...register('memory_utilization_pct', { valueAsNumber: true })}
                  />

                  <Input
                    label="concurrent_pipelines"
                    type="number"
                    min={0}
                    {...register('concurrent_pipelines', { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={predictMutation.isPending}
                    leftIcon={<Play className="w-4 h-4" />}
                  >
                    Execute Failure Prediction
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Current Prediction Result View */}
          {currentPrediction && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Prediction Output</CardTitle>
                  <p className="text-xs text-slate-500">
                    Actual response returned by POST /predictions/failure/{selectedDataset}
                  </p>
                </div>
                {getRiskBadge(currentRisk)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Failure Probability
                    </span>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">
                      {(currentPrediction.failure_probability * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Risk Category
                    </span>
                    <div className="mt-2">{getRiskBadge(currentRisk)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Predicted Failure
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-2">
                      {typeof currentPrediction.predicted_failure === 'boolean'
                        ? currentPrediction.predicted_failure
                          ? 'YES (Failure Risk)'
                          : 'NO (Nominal)'
                        : currentPrediction.prediction !== undefined
                        ? String(currentPrediction.prediction)
                        : '—'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Timestamp
                    </span>
                    <p className="text-xs font-mono text-slate-700 mt-2">
                      {currentPrediction.timestamp || currentPrediction.created_at
                        ? new Date(
                            currentPrediction.timestamp || currentPrediction.created_at!
                          ).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-900">
                    Inspect Raw Prediction Payload
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(currentPrediction, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}

          {/* Historical Predictions Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Prediction History ({selectedDataset})</CardTitle>
                <p className="text-xs text-slate-500">
                  Returned by <code>GET /predictions/failure/{'{dataset_name}'}/history</code>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchHistory()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </CardHeader>

            {historyError && (
              <div className="mx-5 my-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {historyError instanceof Error
                    ? historyError.message
                    : 'Failed to load prediction history.'}
                </span>
              </div>
            )}

            {historyLoading ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                Loading prediction history...
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No prediction history found for <code>{selectedDataset}</code>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">ID</th>
                      <th className="px-5 py-3.5">Dataset</th>
                      <th className="px-5 py-3.5">Pipeline</th>
                      <th className="px-5 py-3.5">Failure Probability</th>
                      <th className="px-5 py-3.5">Risk Category</th>
                      <th className="px-5 py-3.5">Actual Outcome</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item) => {
                      const ts = item.created_at || item.timestamp;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-medium text-slate-900">
                            {item.id}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800">
                            {item.dataset_name}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-600">
                            {item.pipeline_name || '—'}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {(item.failure_probability * 100).toFixed(1)}%
                          </td>
                          <td className="px-5 py-3.5">
                            {getRiskBadge(item.risk_category || item.risk_level)}
                          </td>
                          <td className="px-5 py-3.5">
                            {item.actual_outcome ? (
                              <span className="font-semibold text-slate-800">
                                {item.actual_outcome}
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">
                            {ts ? new Date(ts).toLocaleString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Evaluation Tab */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Returned by <code>GET /predictions/evaluation</code>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchEvaluation()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Evaluation
            </Button>
          </div>

          {evalError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {evalError instanceof Error
                  ? evalError.message
                  : 'Failed to load model evaluation metrics.'}
              </span>
            </div>
          )}

          {evalLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading model evaluation...
            </div>
          ) : evaluation ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatCard
                  title="ROC-AUC"
                  value={evaluation.roc_auc !== undefined ? evaluation.roc_auc.toFixed(3) : '—'}
                  subtitle="Area Under ROC Curve"
                  status={evaluation.roc_auc !== undefined ? 'healthy' : 'neutral'}
                />
                <StatCard
                  title="Accuracy"
                  value={
                    evaluation.accuracy !== undefined
                      ? `${(evaluation.accuracy * 100).toFixed(1)}%`
                      : '—'
                  }
                  subtitle="Overall classification"
                />
                <StatCard
                  title="Precision"
                  value={
                    evaluation.precision !== undefined
                      ? `${(evaluation.precision * 100).toFixed(1)}%`
                      : '—'
                  }
                  subtitle="Positive predictive value"
                />
                <StatCard
                  title="Recall"
                  value={
                    evaluation.recall !== undefined
                      ? `${(evaluation.recall * 100).toFixed(1)}%`
                      : '—'
                  }
                  subtitle="True positive sensitivity"
                />
                <StatCard
                  title="F1 Score"
                  value={evaluation.f1_score !== undefined ? evaluation.f1_score.toFixed(3) : '—'}
                  subtitle="Harmonic mean"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {normalizedConfusion && (
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>Confusion Matrix</CardTitle>
                        <p className="text-xs text-slate-500">
                          Total evaluated samples:{' '}
                          {normalizedConfusion.true_positive +
                            normalizedConfusion.false_positive +
                            normalizedConfusion.false_negative +
                            normalizedConfusion.true_negative}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-center text-xs">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                            True Positive
                          </span>
                          <p className="text-2xl font-bold text-emerald-900 mt-1">
                            {normalizedConfusion.true_positive}
                          </p>
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <span className="text-[10px] font-bold text-amber-700 uppercase">
                            False Positive
                          </span>
                          <p className="text-2xl font-bold text-amber-900 mt-1">
                            {normalizedConfusion.false_positive}
                          </p>
                        </div>
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                          <span className="text-[10px] font-bold text-rose-700 uppercase">
                            False Negative
                          </span>
                          <p className="text-2xl font-bold text-rose-900 mt-1">
                            {normalizedConfusion.false_negative}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-700 uppercase">
                            True Negative
                          </span>
                          <p className="text-2xl font-bold text-slate-900 mt-1">
                            {normalizedConfusion.true_negative}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Feature Importances</CardTitle>
                      <p className="text-xs text-slate-500">
                        Returned feature weights from model evaluation
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {normalizedFeatureImportances.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400">
                        Feature importance weights were not included in the evaluation response.
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={normalizedFeatureImportances.slice(0, 12)}
                            margin={{ left: 40 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                            <YAxis
                              dataKey="feature"
                              type="category"
                              stroke="#94a3b8"
                              fontSize={10}
                              width={140}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1e293b',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '11px',
                              }}
                            />
                            <Bar dataKey="importance" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            !evalError && (
              <div className="py-10 text-center text-xs text-slate-400">
                No model evaluation report available.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
