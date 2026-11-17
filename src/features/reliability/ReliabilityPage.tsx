import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reliabilityApi } from '../../services/api/reliabilityApi';
import { ReliabilityScoreResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../context/ConfigContext';
import {
  Activity,
  Award,
  Clock,
  Play,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
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

export const ReliabilityPage: React.FC = () => {
  const { addToast } = useConfig();
  const [datasetType, setDatasetType] = useState('customers');
  const [result, setResult] = useState<ReliabilityScoreResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await reliabilityApi.calculateReliability(datasetType);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      addToast({
        type: 'success',
        title: `Reliability Calculated: ${data.dataset_name}`,
        message: `Overall Score: ${data.overall_score} (${data.status}).`,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'Reliability Calculation Failed',
        message: err.message,
      });
    },
  });

  const scoreChartData = result
    ? [
        { dimension: 'Quality Score', score: result.quality_score },
        { dimension: 'Freshness Score', score: result.freshness_score },
        { dimension: 'Pipeline Score', score: result.pipeline_score },
        { dimension: 'Overall Score', score: result.overall_score },
      ]
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reliability Scoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Calculate composite reliability score across quality, freshness, and pipeline success (POST /reliability/calculate/{'{dataset_type}'})
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Calculate Dataset Reliability</CardTitle>
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
                <option value="customers">customers (bronze_customers)</option>
                <option value="products">products (bronze_products)</option>
                <option value="orders">orders (bronze_orders)</option>
              </Select>
            </div>

            <div className="pt-5 sm:ml-auto">
              <Button
                variant="primary"
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate()}
                leftIcon={<Play className="w-4 h-4" />}
              >
                Calculate Reliability
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Overall Score"
              value={result.overall_score}
              subtitle={`Status: ${result.status}`}
              status={result.overall_score >= 85 ? 'healthy' : result.overall_score >= 60 ? 'warning' : 'critical'}
              icon={<Award className="w-4 h-4" />}
            />
            <StatCard
              title="Quality Score"
              value={result.quality_score}
              subtitle="From quality checks"
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <StatCard
              title="Freshness Score"
              value={result.freshness_score}
              subtitle="From SLA monitor"
              icon={<Clock className="w-4 h-4" />}
            />
            <StatCard
              title="Pipeline Score"
              value={result.pipeline_score}
              subtitle={`${result.successful_pipeline_runs}/${result.recent_pipeline_runs} runs succeeded`}
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              title="Persistence"
              value={result.persisted ? 'Saved' : 'Not Saved'}
              subtitle={
                result.reliability_record_id ? `Record ID: #${result.reliability_record_id}` : 'Session calculation'
              }
              status={result.persisted ? 'healthy' : 'neutral'}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Reliability Component Breakdown</CardTitle>
                <p className="text-xs text-slate-500">
                  Dataset: {result.dataset_name} | Calculated at {new Date(result.calculated_at).toLocaleString()}
                </p>
              </div>
              <Badge variant={result.status?.toUpperCase() === 'HEALTHY' ? 'healthy' : 'degraded'} size="sm">
                {result.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dimension" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No Reliability Calculation Run</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Select customers, products, or orders above and click "Calculate Reliability".
          </p>
        </div>
      )}
    </div>
  );
};
