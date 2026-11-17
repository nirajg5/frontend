import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { aiAnalysisApi } from '../../services/api/aiAnalysisApi';
import { incidentsApi } from '../../services/api/incidentsApi';
import { AIAnalysisDemoRequest, AIAnalysisResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../context/ConfigContext';
import {
  BrainCircuit,
  Sparkles,
  AlertOctagon,
  AlertCircle,
} from 'lucide-react';

export const AiAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();

  const [incidentCode, setIncidentCode] = useState<string>(
    searchParams.get('incident_code') || ''
  );

  // Exact demo schema payload
  const [demoPayload, setDemoPayload] = useState<AIAnalysisDemoRequest>({
    dataset_name: 'bronze_orders',
    incident_type: 'PIPELINE_FAILURE',
    severity: 'HIGH',
    description: 'Pipeline execution failed during processing.',
    pipeline_status: 'FAILED',
    error_message: 'Sample error message',
  });

  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: incidentsData } = useQuery({
    queryKey: ['incidentsList'],
    queryFn: () => incidentsApi.getIncidents(),
  });

  const incidents = incidentsData?.data || [];

  // POST /ai-analysis/{incident_code}
  const incidentMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const code = incidentCode.trim() || incidents[0]?.incident_code;
      if (!code) {
        throw new Error('Please enter or select an incident code.');
      }
      const res = await aiAnalysisApi.analyzeIncident(code);
      return res.data;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      addToast({
        type: 'success',
        title: 'AI Incident Analysis Complete',
        message: `Analysis returned for incident ${data.incident_code || incidentCode}.`,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'AI Analysis Failed',
        message: err.message,
      });
    },
  });

  // POST /ai-analysis/demo
  const demoMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await aiAnalysisApi.runDemoAnalysis(demoPayload);
      return res.data;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      addToast({
        type: 'info',
        title: 'AI Demo Analysis Complete',
        message: `Analyzed demo scenario for ${demoPayload.dataset_name}.`,
      });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        title: 'AI Demo Failed',
        message: err.message,
      });
    },
  });

  const rootCauseText =
    analysisResult?.root_cause ||
    analysisResult?.root_cause_hypothesis ||
    analysisResult?.summary ||
    analysisResult?.analysis;

  const mitigationItems =
    analysisResult?.recommendations ||
    analysisResult?.recommended_actions ||
    analysisResult?.suggested_mitigation;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Root Cause Diagnostics</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Run LLM-powered incident analysis (POST /ai-analysis/{'{incident_code}'} and POST /ai-analysis/demo)
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specific Incident Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <CardTitle>Analyze Registered Incident</CardTitle>
            </div>
            <p className="text-xs text-slate-500">POST /ai-analysis/{'{incident_code}'}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {incidents.length > 0 && (
              <Select
                label="Select Existing Incident"
                value={incidentCode}
                onChange={(e) => setIncidentCode(e.target.value)}
              >
                <option value="">-- Choose an incident --</option>
                {incidents.map((inc) => (
                  <option key={inc.incident_code} value={inc.incident_code}>
                    {inc.incident_code} — {inc.dataset_name} ({inc.severity})
                  </option>
                ))}
              </Select>
            )}

            <Input
              label="Or Enter Incident Code"
              value={incidentCode}
              onChange={(e) => setIncidentCode(e.target.value)}
              placeholder="e.g. INC-2026-1042"
            />

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                isLoading={incidentMutation.isPending}
                onClick={() => incidentMutation.mutate()}
                leftIcon={<BrainCircuit className="w-4 h-4" />}
              >
                Analyze Incident
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Demo Analysis Sandbox */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <CardTitle>AI Analysis Demo Endpoint</CardTitle>
            </div>
            <p className="text-xs text-slate-500">POST /ai-analysis/demo</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Dataset Name"
                value={demoPayload.dataset_name}
                onChange={(e) => setDemoPayload({ ...demoPayload, dataset_name: e.target.value })}
              />
              <Input
                label="Incident Type"
                value={demoPayload.incident_type}
                onChange={(e) => setDemoPayload({ ...demoPayload, incident_type: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Severity"
                value={demoPayload.severity}
                onChange={(e) => setDemoPayload({ ...demoPayload, severity: e.target.value })}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </Select>
              <Input
                label="Pipeline Status"
                value={demoPayload.pipeline_status}
                onChange={(e) => setDemoPayload({ ...demoPayload, pipeline_status: e.target.value })}
              />
            </div>

            <Input
              label="Description"
              value={demoPayload.description}
              onChange={(e) => setDemoPayload({ ...demoPayload, description: e.target.value })}
            />

            <Textarea
              label="Error Message"
              rows={2}
              value={demoPayload.error_message}
              onChange={(e) => setDemoPayload({ ...demoPayload, error_message: e.target.value })}
            />

            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                isLoading={demoMutation.isPending}
                onClick={() => demoMutation.mutate()}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Run AI Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Output */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>AI Diagnostic Output</CardTitle>
              <p className="text-xs text-slate-500">
                {analysisResult.incident_code ? `Incident: ${analysisResult.incident_code}` : 'Backend Analysis Response'}
                {analysisResult.dataset_name ? ` | Dataset: ${analysisResult.dataset_name}` : ''}
              </p>
            </div>
            {analysisResult.confidence_score !== undefined && (
              <Badge variant="info">
                Confidence: {(analysisResult.confidence_score * 100).toFixed(0)}%
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {rootCauseText && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <h5 className="font-bold text-slate-900">Root Cause / Summary</h5>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{rootCauseText}</p>
              </div>
            )}

            {mitigationItems && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <h5 className="font-bold text-emerald-900">Recommendations / Mitigation</h5>
                {Array.isArray(mitigationItems) ? (
                  <ul className="list-disc list-inside space-y-1 text-emerald-900">
                    {mitigationItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-900 whitespace-pre-line">{mitigationItems}</p>
                )}
              </div>
            )}

            <details className="pt-2 border-t border-slate-100">
              <summary className="cursor-pointer font-semibold text-slate-500 hover:text-slate-800">
                Inspect Raw Backend JSON Response
              </summary>
              <pre className="mt-2 p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
                {JSON.stringify(analysisResult, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {!analysisResult && !incidentMutation.isPending && !demoMutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <BrainCircuit className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No AI Diagnostics Executed</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Select an incident or execute the demo payload above to view the backend AI analysis.
          </p>
        </div>
      )}
    </div>
  );
};
