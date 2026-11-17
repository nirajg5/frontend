import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { etlApi } from '../../services/api/etlApi';
import { SilverETLResponse, GoldBuildResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { useConfig } from '../../context/ConfigContext';
import {
  Workflow,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sliders,
} from 'lucide-react';

export const EtlPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();
  const [activeTab, setActiveTab] = useState<'silver' | 'gold'>('silver');

  // Silver ETL State (customers, products, orders)
  const [silverDatasetType, setSilverDatasetType] = useState(
    searchParams.get('dataset_type') || 'customers'
  );
  const [silverResult, setSilverResult] = useState<SilverETLResponse | null>(null);
  const [silverError, setSilverError] = useState<string | null>(null);

  // Gold Build State
  const [goldResult, setGoldResult] = useState<GoldBuildResponse | null>(null);
  const [goldError, setGoldError] = useState<string | null>(null);

  // Silver Mutation: POST /etl/silver/{dataset_type} (no JSON body)
  const silverMutation = useMutation({
    mutationFn: async () => {
      setSilverError(null);
      const res = await etlApi.triggerSilverETL(silverDatasetType);
      return res.data;
    },
    onSuccess: (data) => {
      setSilverResult(data);
      addToast({
        type: 'success',
        title: `Silver ETL Completed (${data.dataset_type})`,
        message: `Read ${data.rows_read.toLocaleString()} rows from ${data.source_table}, wrote ${data.rows_written.toLocaleString()} rows to ${data.target_table}.`,
      });
    },
    onError: (err: Error) => {
      setSilverError(err.message);
      addToast({
        type: 'error',
        title: 'Silver ETL Failed',
        message: err.message,
      });
    },
  });

  // Gold Mutation: POST /etl/gold/build (no JSON body)
  const goldMutation = useMutation({
    mutationFn: async () => {
      setGoldError(null);
      const res = await etlApi.triggerGoldBuild();
      return res.data;
    },
    onSuccess: (data) => {
      setGoldResult(data);
      addToast({
        type: 'success',
        title: 'Gold Layer Build Completed',
        message: `Created/updated ${data.tables_created.length} Gold tables.`,
      });
    },
    onError: (err: Error) => {
      setGoldError(err.message);
      addToast({
        type: 'error',
        title: 'Gold Build Failed',
        message: err.message,
      });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">ETL &amp; Data Transformations</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute Silver layer cleansing (POST /etl/silver/{'{dataset_type}'}) or build Gold analytical tables (POST /etl/gold/build)
        </p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'silver' | 'gold')}
        tabs={[
          {
            id: 'silver',
            label: 'Silver Layer ETL',
            icon: <Layers className="w-4 h-4" />,
          },
          {
            id: 'gold',
            label: 'Gold Mart Build',
            icon: <Sparkles className="w-4 h-4" />,
          },
        ]}
      />

      {activeTab === 'silver' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Silver Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Trigger Silver ETL Job</CardTitle>
                <p className="text-xs text-slate-500">
                  Transforms Bronze data into cleansed, typed Silver tables (no request body required)
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {silverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{silverError}</span>
                </div>
              )}

              <Select
                label="Supported Silver Dataset Type"
                value={silverDatasetType}
                onChange={(e) => setSilverDatasetType(e.target.value)}
              >
                <option value="customers">customers (bronze_customers → silver_customers)</option>
                <option value="products">products (bronze_products → silver_products)</option>
                <option value="orders">orders (bronze_orders → silver_orders)</option>
              </Select>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  isLoading={silverMutation.isPending}
                  onClick={() => silverMutation.mutate()}
                  leftIcon={<Workflow className="w-4 h-4" />}
                >
                  Execute Silver ETL
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Silver Execution Result */}
          <Card>
            <CardHeader>
              <CardTitle>Silver ETL Result</CardTitle>
            </CardHeader>
            <CardContent>
              {silverResult ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Status: {silverResult.status}
                    </div>
                    <p className="text-slate-600 text-[11px] font-mono">
                      {silverResult.source_table} → {silverResult.target_table}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Read</span>
                      <p className="text-base font-bold text-slate-900">
                        {silverResult.rows_read.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Written</span>
                      <p className="text-base font-bold text-emerald-700">
                        {silverResult.rows_written.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Sliders className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Select a dataset type and click Execute Silver ETL.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gold Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Build Gold Business Layer</CardTitle>
                <p className="text-xs text-slate-500">
                  Executes POST /etl/gold/build across Silver customer, product, and order tables
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {goldError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{goldError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <p className="font-semibold text-slate-800">Gold Layer Build Execution</p>
                <p className="text-slate-600 leading-relaxed">
                  Triggers server-side Gold aggregations joining Silver customers, products, and orders.
                  Ensure Silver ETL steps have completed before running the Gold build.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  isLoading={goldMutation.isPending}
                  onClick={() => goldMutation.mutate()}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Build Gold Layer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gold Result */}
          <Card>
            <CardHeader>
              <CardTitle>Gold Build Result</CardTitle>
            </CardHeader>
            <CardContent>
              {goldResult ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Status: {goldResult.status}
                    </div>
                    {goldResult.unmatched_products !== undefined && (
                      <p className="text-slate-600 text-[11px]">
                        Unmatched Products: <strong>{goldResult.unmatched_products}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">
                      Tables Created &amp; Row Counts
                    </span>
                    <div className="space-y-1.5">
                      {(goldResult.tables_created || []).map((tbl) => (
                        <div
                          key={tbl}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                        >
                          <span className="font-mono font-medium text-slate-800">{tbl}</span>
                          <span className="font-bold text-slate-900">
                            {goldResult.row_counts?.[tbl]?.toLocaleString() ?? '—'} rows
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Click Build Gold Layer to materialize analytical marts.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
