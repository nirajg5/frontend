import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { incidentsApi } from '../../services/api/incidentsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { IncidentItem } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useConfig } from '../../context/ConfigContext';
import {
  AlertOctagon,
  CheckCircle2,
  BrainCircuit,
  ShieldAlert,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_DATASETS = ['bronze_customers', 'bronze_products', 'bronze_orders'];

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useConfig();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [incidentToResolve, setIncidentToResolve] = useState<IncidentItem | null>(null);
  const [detectDataset, setDetectDataset] = useState('bronze_orders');

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const registeredNames = (datasetsData?.data || []).map((d) => d.dataset_name);
  const availableDatasets = registeredNames.length > 0 ? registeredNames : DEFAULT_DATASETS;

  const { data: incidentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['incidentsList', statusFilter],
    queryFn: () =>
      incidentsApi.getIncidents({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await incidentsApi.detectDatasetIncidents(detectDataset);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidentsList'] });
      const count = data.incidents_detected ?? data.detected_count ?? data.incidents?.length ?? 0;
      addToast({
        type: count > 0 ? 'warning' : 'success',
        title: `Incident Detection Finished (${detectDataset})`,
        message: data.message || `Detected ${count} incident(s).`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Incident Detection Failed',
        message: err.message,
      });
    },
  });

  const pipelineFailScanMutation = useMutation({
    mutationFn: async () => {
      const res = await incidentsApi.detectPipelineFailures(detectDataset);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidentsList'] });
      const count = data.new_failures_flagged ?? data.incidents_created ?? data.incidents?.length ?? 0;
      addToast({
        type: 'info',
        title: 'Pipeline Failure Detection Finished',
        message: data.message || `Flagged ${count} pipeline failure incident(s) for ${detectDataset}.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Pipeline Failure Detection Failed',
        message: err.message,
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!incidentToResolve) return;
      const res = await incidentsApi.resolveIncident(incidentToResolve.incident_code);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidentsList'] });
      setIncidentToResolve(null);
      if (selectedIncident?.incident_code === data?.incident_code) {
        setSelectedIncident(data || null);
      }
      addToast({
        type: 'success',
        title: `Incident ${data?.incident_code} Resolved`,
        message: 'Incident status updated to RESOLVED.',
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to Resolve Incident',
        message: err.message,
      });
    },
  });

  const incidents = incidentsData?.data || [];

  const getSeverityBadge = (sev: string) => {
    const s = String(sev).toUpperCase();
    if (s === 'CRITICAL') return <Badge variant="critical" size="sm">CRITICAL</Badge>;
    if (s === 'HIGH') return <Badge variant="high" size="sm">HIGH</Badge>;
    if (s === 'MEDIUM') return <Badge variant="medium" size="sm">MEDIUM</Badge>;
    return <Badge variant="low" size="sm">{s}</Badge>;
  };

  const getStatusBadge = (st: string) => {
    const s = String(st).toUpperCase();
    if (s === 'OPEN') return <Badge variant="critical" size="sm" dot>OPEN</Badge>;
    if (s === 'INVESTIGATING') return <Badge variant="degraded" size="sm" dot>INVESTIGATING</Badge>;
    if (s === 'RESOLVED') return <Badge variant="healthy" size="sm" dot>RESOLVED</Badge>;
    return <Badge variant="neutral" size="sm">{s}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Incident Management &amp; Triage</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Detect dataset anomalies, flag pipeline failure incidents, and resolve incidents (GET /incidents/)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Feed
        </Button>
      </div>

      {/* Detection Trigger Banner */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <CardTitle>Automated Anomaly &amp; Pipeline Failure Detection</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-80">
              <Select
                label="Target Dataset"
                value={detectDataset}
                onChange={(e) => setDetectDataset(e.target.value)}
              >
                {availableDatasets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-5 w-full sm:w-auto sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                isLoading={pipelineFailScanMutation.isPending}
                onClick={() => pipelineFailScanMutation.mutate()}
              >
                Detect Pipeline Failures
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={scanMutation.isPending}
                onClick={() => scanMutation.mutate()}
                leftIcon={<AlertOctagon className="w-4 h-4" />}
              >
                Detect Dataset Incidents
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Filter Bar (matches backend ?status= query param) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium mr-1">Filter Status:</span>
          {['all', 'OPEN', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>

        <span className="text-slate-400 font-medium">{incidents.length} incident(s)</span>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error instanceof Error ? error.message : 'Failed to load incidents.'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Incidents Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Incident Code</th>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Dataset</th>
                <th className="px-5 py-3.5">Detected</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading incidents...
                  </td>
                </tr>
              )}

              {!isLoading &&
                incidents.map((inc) => {
                  const isResolved = String(inc.status).toUpperCase() === 'RESOLVED';
                  const ts = inc.detected_at || inc.created_at;
                  return (
                    <tr key={inc.incident_code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="hover:text-indigo-600 cursor-pointer"
                        >
                          {inc.incident_code}
                        </button>
                      </td>
                      <td className="px-5 py-4">{getSeverityBadge(inc.severity)}</td>
                      <td className="px-5 py-4">{getStatusBadge(inc.status)}</td>
                      <td className="px-5 py-4 max-w-md">
                        {inc.title && <h5 className="font-semibold text-slate-900">{inc.title}</h5>}
                        <p className="text-[11px] text-slate-600 line-clamp-2">{inc.description}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-800">{inc.dataset_name}</td>
                      <td className="px-5 py-4 text-slate-400">
                        {ts
                          ? new Date(ts).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIncident(inc)}
                          >
                            Inspect
                          </Button>
                          {!isResolved && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => setIncidentToResolve(inc)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && !error && incidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    No incidents returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Incident Detail Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident?.title || selectedIncident?.incident_code || 'Incident Detail'}
        description={`Code: ${selectedIncident?.incident_code} | Dataset: ${selectedIncident?.dataset_name}`}
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const code = selectedIncident?.incident_code;
                setSelectedIncident(null);
                navigate(`/ai-analysis?incident_code=${encodeURIComponent(code || '')}`);
              }}
              leftIcon={<BrainCircuit className="w-3.5 h-3.5" />}
            >
              AI Analysis
            </Button>
            <div className="flex items-center gap-2">
              {selectedIncident && String(selectedIncident.status).toUpperCase() !== 'RESOLVED' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setIncidentToResolve(selectedIncident)}
                >
                  Resolve Incident
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedIncident(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedIncident && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2">
              {getSeverityBadge(selectedIncident.severity)}
              {getStatusBadge(selectedIncident.status)}
              {selectedIncident.incident_type && (
                <Badge variant="neutral" size="sm">
                  {selectedIncident.incident_type}
                </Badge>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <h5 className="font-semibold text-slate-900">Description</h5>
              <p className="text-slate-700 leading-relaxed">{selectedIncident.description}</p>
            </div>

            {selectedIncident.resolved_at && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                Resolved at: {new Date(selectedIncident.resolved_at).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Incident Confirmation Modal (PATCH /incidents/{incident_code}/resolve with no body) */}
      <Modal
        isOpen={!!incidentToResolve}
        onClose={() => setIncidentToResolve(null)}
        title={`Resolve Incident: ${incidentToResolve?.incident_code}`}
        description="PATCH /incidents/{incident_code}/resolve"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIncidentToResolve(null)}>
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              isLoading={resolveMutation.isPending}
              onClick={() => resolveMutation.mutate()}
            >
              Confirm Resolve
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Confirm resolution of incident <strong>{incidentToResolve?.incident_code}</strong> for dataset{' '}
          <span className="font-mono font-semibold">{incidentToResolve?.dataset_name}</span>?
          This will update the incident status to RESOLVED in the backend database.
        </p>
      </Modal>
    </div>
  );
};
