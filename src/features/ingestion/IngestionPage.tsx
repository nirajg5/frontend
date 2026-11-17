import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ingestionApi } from '../../services/api/ingestionApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { FailurePredictionRequest, IngestionResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../context/ConfigContext';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

const DEFAULT_DATASETS = ['bronze_customers', 'bronze_products', 'bronze_orders'];

export const IngestionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const registeredNames = (datasetsData?.data || []).map((d) => d.dataset_name);
  const availableDatasets = registeredNames.length > 0 ? registeredNames : DEFAULT_DATASETS;

  const [datasetName, setDatasetName] = useState(
    searchParams.get('dataset_name') || availableDatasets[0]
  );

  useEffect(() => {
    const paramName = searchParams.get('dataset_name');
    if (paramName) setDatasetName(paramName);
  }, [searchParams]);

  // Optional failure prediction features toggle
  const [includePredictionFeatures, setIncludePredictionFeatures] = useState(false);
  const [predictionFeatures, setPredictionFeatures] = useState<FailurePredictionRequest>({
    pipeline_name: 'bronze_csv_ingestion',
    pipeline_run_id: null,
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
  });

  const [lastResult, setLastResult] = useState<IngestionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await ingestionApi.submitIngestion(
        datasetName,
        includePredictionFeatures ? predictionFeatures : undefined
      );
      return res.data;
    },
    onSuccess: (result) => {
      setLastResult(result);
      addToast({
        type: 'success',
        title: 'CSV Ingestion Completed',
        message: `Dataset ${result.dataset_name} ingested ${result.rows_ingested.toLocaleString()} rows (Status: ${result.status}).`,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'CSV Ingestion Failed',
        message: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const selectedDatasetObj = (datasetsData?.data || []).find(
    (d) => d.dataset_name === datasetName
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">CSV Dataset Ingestion</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest registered CSV source files from data/source/ into Bronze tables (POST /ingestion/dataset?dataset_name=...)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingestion Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Trigger CSV Ingestion</CardTitle>
              <p className="text-xs text-slate-500">
                Current backend supports registered CSV datasets in data/source/
              </p>
            </div>
            <Badge variant="info" size="sm">CSV ONLY</Badge>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Select
                label="Registered CSV Dataset"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              >
                {availableDatasets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="font-semibold text-slate-800">Source File Location</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {selectedDatasetObj?.source_path ||
                        `data/source/${datasetName.replace(/^bronze_/, '')}.csv`}
                    </p>
                  </div>
                </div>
                <Badge variant="neutral" size="sm">
                  {selectedDatasetObj?.source_type || 'CSV'}
                </Badge>
              </div>

              {/* Optional Pre-Run Failure Prediction Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-800">
                      Include Pre-Run Failure Prediction Features (Optional)
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Send runtime telemetry features in request body to compute failure risk alongside ingestion
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includePredictionFeatures}
                    onChange={(e) => setIncludePredictionFeatures(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </label>

                {includePredictionFeatures && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <Input
                      label="Expected Rows"
                      type="number"
                      value={predictionFeatures.expected_rows}
                      onChange={(e) =>
                        setPredictionFeatures({
                          ...predictionFeatures,
                          expected_rows: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Freshness Lag (min)"
                      type="number"
                      value={predictionFeatures.source_freshness_lag_minutes}
                      onChange={(e) =>
                        setPredictionFeatures({
                          ...predictionFeatures,
                          source_freshness_lag_minutes: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="CPU Utilization (%)"
                      type="number"
                      value={predictionFeatures.cpu_utilization_pct}
                      onChange={(e) =>
                        setPredictionFeatures({
                          ...predictionFeatures,
                          cpu_utilization_pct: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Memory Utilization (%)"
                      type="number"
                      value={predictionFeatures.memory_utilization_pct}
                      onChange={(e) =>
                        setPredictionFeatures({
                          ...predictionFeatures,
                          memory_utilization_pct: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Concurrent Pipelines"
                      type="number"
                      value={predictionFeatures.concurrent_pipelines}
                      onChange={(e) =>
                        setPredictionFeatures({
                          ...predictionFeatures,
                          concurrent_pipelines: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Success Streak"
                      type="number"
                      value={predictionFeatures.success_streak_before_run}
                      onChange={(e) =>
                        setPredictionFeatures({
                          ...predictionFeatures,
                          success_streak_before_run: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={mutation.isPending}
                  leftIcon={<UploadCloud className="w-4 h-4" />}
                >
                  Run CSV Ingestion
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Execution Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Ingestion Result</CardTitle>
          </CardHeader>
          <CardContent>
            {lastResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Status: {lastResult.status}
                  </div>
                  <p className="text-[11px] text-emerald-700 font-mono">
                    Pipeline: {lastResult.pipeline_name || 'bronze_csv_ingestion'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Run ID</span>
                    <p className="font-bold font-mono text-slate-900">
                      #{lastResult.run_id ?? lastResult.pipeline_run_id ?? '—'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Ingested</span>
                    <p className="font-bold text-slate-900">
                      {lastResult.rows_ingested?.toLocaleString() ?? 0}
                    </p>
                  </div>
                </div>

                {lastResult.prediction && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-[10px] text-indigo-700 uppercase font-bold block mb-1">
                      Inline Failure Prediction
                    </span>
                    <pre className="text-[11px] font-mono text-indigo-900 overflow-x-auto">
                      {JSON.stringify(lastResult.prediction, null, 2)}
                    </pre>
                  </div>
                )}

                {lastResult.prediction_error && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                    Prediction notice: {lastResult.prediction_error}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                <UploadCloud className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                Select a CSV dataset and click "Run CSV Ingestion" to execute the Bronze intake pipeline.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
