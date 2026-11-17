import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { datasetsApi } from '../../services/api/datasetsApi';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  Database,
  Search,
  UploadCloud,
  RefreshCw,
  Plus,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

export const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const { addToast } = useConfig();

  const [searchTerm, setSearchTerm] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);

  // Registration form fields
  const [datasetName, setDatasetName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourcePath, setSourcePath] = useState('data/source/');
  const [owner, setOwner] = useState(user?.username || 'admin');

  const canRegister = hasRole(['ADMIN', 'DATA_ENGINEER']);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      datasetsApi.registerDataset({
        dataset_name: datasetName.trim(),
        source_type: 'CSV',
        source_name: sourceName.trim(),
        source_path: sourcePath.trim(),
        owner: owner.trim() || user?.username || 'admin',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['datasetsList'] });
      setRegisterOpen(false);
      setDatasetName('');
      setSourceName('');
      setSourcePath('data/source/');
      addToast({
        type: 'success',
        title: 'Dataset Registered',
        message: `Registered CSV dataset "${res.data.dataset_name}".`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Dataset Registration Failed',
        message: err.message,
      });
    },
  });

  const datasets = data?.data || [];

  const filteredDatasets = datasets.filter((ds) => {
    const q = searchTerm.toLowerCase();
    return (
      ds.dataset_name.toLowerCase().includes(q) ||
      ds.source_name.toLowerCase().includes(q) ||
      ds.source_path.toLowerCase().includes(q) ||
      ds.owner.toLowerCase().includes(q)
    );
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePath.trim().startsWith('data/source/')) {
      addToast({
        type: 'error',
        title: 'Invalid Source Path',
        message: 'CSV source_path must reside inside data/source/ directory.',
      });
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered CSV datasets returned by GET /datasets/
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          {canRegister && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setRegisterOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Register Dataset
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dataset_name, source_name, path, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {filteredDatasets.length} registered datasets
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error instanceof Error ? error.message : 'Failed to load datasets.'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Datasets Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">Dataset Name</th>
                <th className="px-5 py-3.5">Source Type</th>
                <th className="px-5 py-3.5">Source Name</th>
                <th className="px-5 py-3.5">Source Path</th>
                <th className="px-5 py-3.5">Owner</th>
                <th className="px-5 py-3.5 text-right">Workflows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading registered datasets...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredDatasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono text-slate-400">#{ds.id}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-900 font-mono">
                          {ds.dataset_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="info" size="sm">
                        {ds.source_type}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-700">{ds.source_name}</td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600">{ds.source_path}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{ds.owner}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/ingestion?dataset_name=${encodeURIComponent(ds.dataset_name)}`)
                          }
                          leftIcon={<UploadCloud className="w-3 h-3" />}
                        >
                          Ingest
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/quality?dataset_type=${encodeURIComponent(ds.source_name)}`)
                          }
                        >
                          Quality
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/freshness?dataset_name=${encodeURIComponent(ds.dataset_name)}`)
                          }
                        >
                          Freshness
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/predictions?dataset_name=${encodeURIComponent(ds.dataset_name)}`)
                          }
                        >
                          Predict
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && !error && filteredDatasets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No datasets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Register Dataset Modal (POST /datasets/) */}
      <Modal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register CSV Dataset"
        description="Register a CSV source dataset in DataSentinel (POST /datasets/)"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setRegisterOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={registerMutation.isPending}
              onClick={handleRegisterSubmit}
              disabled={!datasetName.trim() || !sourceName.trim() || !sourcePath.trim()}
            >
              Register Dataset
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <Input
            label="Dataset Name"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g. bronze_customers"
            required
          />
          <Input
            label="Source Type"
            value="CSV"
            disabled
            hint="Current backend ingestion supports CSV sources only."
          />
          <Input
            label="Source Name (Domain)"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. customers, products, orders"
            required
          />
          <Input
            label="CSV Source Path"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
            placeholder="data/source/customers.csv"
            hint="Must reside inside data/source/"
            required
          />
          <Input
            label="Owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="admin"
            required
          />
        </form>
      </Modal>
    </div>
  );
};
