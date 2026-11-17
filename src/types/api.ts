// DataSentinel Core TypeScript Schemas & Interfaces (Aligned with FastAPI Backend)

export type UserRole = 'ADMIN' | 'DATA_ENGINEER' | 'DATA_ANALYST' | 'VIEWER';

export interface UserResponse {
  id: number | string;
  username: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: Exclude<UserRole, 'ADMIN'> | UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AdminTestResponse {
  status?: string;
  message?: string;
  user?: string;
  role?: string;
  user_role?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface DatasetItem {
  id: number;
  dataset_name: string;
  source_type: string;
  source_name: string;
  source_path: string;
  owner: string;
}

export interface DatasetCreateRequest {
  dataset_name: string;
  source_type: 'CSV';
  source_name: string;
  source_path: string;
  owner?: string;
}

export interface FailurePredictionRequest {
  pipeline_name: string;
  pipeline_run_id: number | null;
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

export interface PredictionResultResponse {
  dataset_name?: string;
  failure_probability: number;
  risk_category?: string;
  risk_level?: string;
  predicted_failure?: boolean;
  prediction?: number | boolean | string;
  confidence?: number;
  model_version?: string;
  timestamp?: string;
  created_at?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IngestionResponse {
  run_id?: number;
  pipeline_run_id?: number;
  pipeline_name?: string;
  dataset_name: string;
  rows_ingested: number;
  status: string;
  prediction?: PredictionResultResponse | Record<string, unknown> | null;
  prediction_error?: string | null;
  [key: string]: unknown;
}

export type DatasetDomainType = 'customers' | 'products' | 'orders';

export interface SilverETLResponse {
  dataset_type: string;
  source_table: string;
  target_table: string;
  rows_read: number;
  rows_written: number;
  status: string;
  [key: string]: unknown;
}

export interface GoldBuildResponse {
  status: string;
  tables_created: string[];
  row_counts: Record<string, number>;
  unmatched_products?: number;
  [key: string]: unknown;
}

export interface QualityCheckDetail {
  check_name?: string;
  rule_name?: string;
  name?: string;
  column?: string;
  status: string; // 'PASS' | 'FAIL'
  passed?: boolean;
  failed_rows?: number;
  details?: string;
  message?: string;
  [key: string]: unknown;
}

export interface QualityCheckResult {
  dataset: string;
  table: string;
  rows_checked: number;
  checks_run: number;
  failed_checks: number;
  overall_status: string;
  results: QualityCheckDetail[];
  [key: string]: unknown;
}

export interface FreshnessResult {
  dataset_name: string;
  sla_hours: number;
  actual_update_time: string | null;
  expected_update_time: string | null;
  age_hours: number | null;
  freshness_status: string;
  freshness_score: number;
  checked_at: string;
  [key: string]: unknown;
}

export interface ReliabilityScoreResponse {
  dataset_name: string;
  quality_score: number;
  freshness_score: number;
  pipeline_score: number;
  overall_score: number;
  status: string;
  recent_pipeline_runs: number;
  successful_pipeline_runs: number;
  persisted: boolean;
  reliability_record_id?: number | null;
  calculated_at: string;
  [key: string]: unknown;
}

export interface IncidentItem {
  id?: number;
  incident_code: string;
  dataset_name: string;
  incident_type?: string;
  pipeline_id?: string | number | null;
  severity: string;
  status: string;
  title?: string;
  description: string;
  detected_at?: string;
  created_at?: string;
  resolved_at?: string | null;
  [key: string]: unknown;
}

export interface IncidentDetectResponse {
  dataset_name?: string;
  incidents_detected?: number;
  detected_count?: number;
  incidents?: IncidentItem[];
  incident_codes?: string[];
  message?: string;
  [key: string]: unknown;
}

export interface PipelineFailureDetectResponse {
  dataset_name?: string;
  new_failures_flagged?: number;
  incidents_created?: number;
  incidents?: IncidentItem[];
  message?: string;
  [key: string]: unknown;
}

export interface AIAnalysisDemoRequest {
  dataset_name: string;
  incident_type: string;
  severity: string;
  description: string;
  pipeline_status: string;
  error_message: string;
}

export interface AIAnalysisResponse {
  incident_code?: string;
  dataset_name?: string;
  root_cause?: string;
  root_cause_hypothesis?: string;
  summary?: string;
  impact_scope?: string;
  impact?: string;
  suggested_mitigation?: string;
  recommendations?: string[] | string;
  recommended_actions?: string[] | string;
  confidence_score?: number;
  analysis?: string;
  model?: string;
  [key: string]: unknown;
}

export interface SourceCitation {
  title?: string;
  doc_id?: string;
  source?: string;
  snippet?: string;
  content?: string;
  score?: number;
  [key: string]: unknown;
}

export interface RAGQueryRequest {
  question: string;
}

export interface RAGQueryResponse {
  question?: string;
  answer: string;
  citations?: SourceCitation[];
  sources?: SourceCitation[] | string[];
  model?: string;
  model_used?: string;
  [key: string]: unknown;
}

export interface AgentInvestigateRequest {
  question: string;
}

export interface AgentStep {
  step_number?: number;
  agent_role?: string;
  node?: string;
  action?: string;
  reasoning?: string;
  output?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

export interface AgentInvestigationResult {
  investigation_id?: string | number;
  task_id?: string;
  question?: string;
  dataset_name?: string;
  status?: string;
  answer?: string;
  summary?: string;
  root_cause?: string;
  recommendations?: string[];
  mitigation_steps?: string[];
  steps_taken?: AgentStep[];
  confidence?: number;
  duration_seconds?: number;
  total_duration_sec?: number;
  completed_at?: string;
  [key: string]: unknown;
}

export interface AsyncTaskResponse {
  task_id: string;
  status: string;
  message?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface TaskStatusResponse {
  task_id: string;
  status: string; // e.g., PENDING | STARTED | RUNNING | SUCCESS | COMPLETED | FAILURE | FAILED
  progress?: number;
  current_step?: string;
  result?: AgentInvestigationResult | Record<string, unknown> | null;
  error?: string | null;
  updated_at?: string;
  [key: string]: unknown;
}

export interface AgentInvestigationSummary {
  id: number | string;
  task_id?: string;
  dataset_name?: string | null;
  question?: string;
  query?: string;
  status: string;
  duration_seconds?: number;
  duration_sec?: number;
  created_at: string;
  [key: string]: unknown;
}

export interface RecoverStaleResponse {
  tasks_inspected?: number;
  recovered_count?: number;
  tasks_recovered?: number;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface AgentMetricsResponse {
  total_investigations: number;
  completed_investigations?: number;
  failed_investigations?: number;
  avg_duration_seconds?: number;
  avg_duration_sec?: number;
  success_rate?: number;
  tokens_consumed?: number;
  active_agents?: number;
  agent_types?: Array<{ role: string; executions: number; avg_time_sec: number }>;
  [key: string]: unknown;
}

export interface ModelStatusResponse {
  model_name?: string;
  version?: string;
  model_version?: string;
  status?: string;
  model_available?: boolean;
  is_trained?: boolean;
  loaded?: boolean;
  trained_at?: string;
  algorithm?: string;
  feature_count?: number;
  [key: string]: unknown;
}

export interface PredictionHistoryItem {
  id: number | string;
  dataset_name: string;
  pipeline_name?: string;
  failure_probability: number;
  risk_category?: string;
  risk_level?: string;
  predicted_failure?: boolean;
  actual_outcome?: string | null;
  created_at?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ModelEvaluationResponse {
  roc_auc?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  confusion_matrix?:
    | number[][]
    | {
        true_positive?: number;
        false_positive?: number;
        true_negative?: number;
        false_negative?: number;
      };
  feature_importances?:
    | Array<{ feature: string; importance: number }>
    | Record<string, number>;
  [key: string]: unknown;
}

export interface PipelineRunItem {
  id?: number;
  run_id: number;
  pipeline_name: string;
  dataset_name: string;
  status: string;
  rows_read?: number | null;
  rows_processed?: number | null;
  rows_loaded?: number | null;
  records_processed?: number | null;
  duration_seconds?: number | null;
  duration_sec?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  error_message?: string | null;
  [key: string]: unknown;
}

export interface PipelineSummaryResponse {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  running_runs?: number;
  pass_rate?: number;
  success_rate?: number;
  avg_duration_seconds?: number;
  avg_duration_sec?: number;
  [key: string]: unknown;
}

export interface PipelineRunDetail extends PipelineRunItem {
  steps?: Array<{
    step_name: string;
    status: string;
    duration_sec?: number;
    records_processed?: number;
    error?: string;
  }>;
  logs?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RootResponse {
  app_name?: string;
  name?: string;
  message?: string;
  version?: string;
  status?: string;
  docs_url?: string;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: string;
  timestamp?: string;
  uptime_sec?: number;
  version?: string;
  [key: string]: unknown;
}

export interface DatabaseHealthResponse {
  status: string;
  database?: string;
  latency_ms?: number;
  error?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface PrometheusMetricItem {
  name: string;
  type: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}
