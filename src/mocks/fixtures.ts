import {
  UserResponse,
  DatasetItem,
  QualityCheckResult,
  FreshnessResult,
  ReliabilityScoreResponse,
  IncidentItem,
  AIAnalysisResponse,
  RAGQueryResponse,
  AgentInvestigationResult,
  AgentInvestigationSummary,
  AgentMetricsResponse,
  ModelStatusResponse,
  PredictionResultResponse,
  PredictionHistoryItem,
  ModelEvaluationResponse,
  PipelineRunItem,
  PipelineSummaryResponse,
  PipelineRunDetail,
  RootResponse,
  HealthResponse,
  DatabaseHealthResponse,
} from '../types/api';

// Demo-mode only fixtures strictly aligned with FastAPI backend schemas.
// Never used automatically on backend failures.

export const DEMO_USERS: Record<string, UserResponse> = {
  ADMIN: {
    id: 1,
    username: 'admin',
    email: 'admin@datasentinel.local',
    role: 'ADMIN',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z',
  },
  DATA_ENGINEER: {
    id: 2,
    username: 'engineer_demo',
    email: 'engineer@datasentinel.local',
    role: 'DATA_ENGINEER',
    is_active: true,
    created_at: '2026-10-05T10:15:00Z',
  },
  DATA_ANALYST: {
    id: 3,
    username: 'analyst_demo',
    email: 'analyst@datasentinel.local',
    role: 'DATA_ANALYST',
    is_active: true,
    created_at: '2026-10-10T14:30:00Z',
  },
};

export const DEMO_DATASETS: DatasetItem[] = [
  {
    id: 1,
    dataset_name: 'bronze_customers',
    source_type: 'CSV',
    source_name: 'customers',
    source_path: 'data/source/customers.csv',
    owner: 'admin',
  },
  {
    id: 2,
    dataset_name: 'bronze_products',
    source_type: 'CSV',
    source_name: 'products',
    source_path: 'data/source/products.csv',
    owner: 'admin',
  },
  {
    id: 3,
    dataset_name: 'bronze_orders',
    source_type: 'CSV',
    source_name: 'orders',
    source_path: 'data/source/orders.csv',
    owner: 'admin',
  },
];

export const DEMO_INCIDENTS: IncidentItem[] = [
  {
    id: 101,
    incident_code: 'INC-2026-1042',
    dataset_name: 'bronze_orders',
    incident_type: 'PIPELINE_FAILURE',
    severity: 'HIGH',
    status: 'OPEN',
    title: 'Orders Ingestion Null Key Anomaly',
    description: 'Detected unexpected null customer_id references in data/source/orders.csv batch.',
    detected_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 102,
    incident_code: 'INC-2026-1039',
    dataset_name: 'bronze_products',
    incident_type: 'FRESHNESS_BREACH',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    title: 'Product Catalog SLA Threshold Exceeded',
    description: 'Latest update age exceeded 24h SLA window prior to scheduled Silver ETL run.',
    detected_at: new Date(Date.now() - 540 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
  },
];

export const DEMO_PIPELINE_RUNS: PipelineRunItem[] = [
  {
    run_id: 104,
    pipeline_name: 'bronze_csv_ingestion',
    dataset_name: 'bronze_orders',
    status: 'FAILED',
    rows_read: 1500,
    rows_processed: 1420,
    rows_loaded: 0,
    duration_seconds: 12.4,
    started_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    error_message: 'IntegrityError: 80 rows missing required customer_id reference.',
  },
  {
    run_id: 103,
    pipeline_name: 'silver_etl_customers',
    dataset_name: 'bronze_customers',
    status: 'SUCCESS',
    rows_read: 500,
    rows_processed: 500,
    rows_loaded: 498,
    duration_seconds: 4.2,
    started_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 64 * 60 * 1000).toISOString(),
  },
  {
    run_id: 102,
    pipeline_name: 'gold_mart_build',
    dataset_name: 'bronze_orders',
    status: 'SUCCESS',
    rows_read: 1420,
    rows_processed: 1420,
    rows_loaded: 1420,
    duration_seconds: 8.7,
    started_at: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 139 * 60 * 1000).toISOString(),
  },
];

export const DEMO_PIPELINE_SUMMARY: PipelineSummaryResponse = {
  total_runs: 24,
  successful_runs: 21,
  failed_runs: 3,
  running_runs: 0,
  avg_duration_seconds: 8.4,
};

export const DEMO_PIPELINE_RUN_DETAIL: PipelineRunDetail = {
  ...DEMO_PIPELINE_RUNS[0],
  logs: '[INFO] Reading data/source/orders.csv\n[ERROR] IntegrityError: 80 rows missing required customer_id reference.',
};

export const DEMO_QUALITY_RESULT: Record<string, QualityCheckResult> = {
  customers: {
    dataset: 'customers',
    table: 'silver_customers',
    rows_checked: 500,
    checks_run: 4,
    failed_checks: 0,
    overall_status: 'PASS',
    results: [
      { check_name: 'not_null_customer_id', column: 'customer_id', status: 'PASS', failed_rows: 0, details: 'All rows contain valid customer_id' },
      { check_name: 'unique_customer_id', column: 'customer_id', status: 'PASS', failed_rows: 0, details: 'No duplicate IDs found' },
      { check_name: 'valid_email_format', column: 'email', status: 'PASS', failed_rows: 0, details: 'All emails match standard pattern' },
      { check_name: 'non_empty_table', status: 'PASS', failed_rows: 0, details: '500 rows verified' },
    ],
  },
  orders: {
    dataset: 'orders',
    table: 'silver_orders',
    rows_checked: 1500,
    checks_run: 4,
    failed_checks: 1,
    overall_status: 'FAIL',
    results: [
      { check_name: 'not_null_order_id', column: 'order_id', status: 'PASS', failed_rows: 0 },
      { check_name: 'positive_total_amount', column: 'total_amount', status: 'PASS', failed_rows: 0 },
      { check_name: 'valid_customer_fk', column: 'customer_id', status: 'FAIL', failed_rows: 80, details: '80 orders reference missing customer IDs' },
      { check_name: 'valid_order_date', column: 'order_date', status: 'PASS', failed_rows: 0 },
    ],
  },
};

export const DEMO_FRESHNESS_RESULT: Record<string, FreshnessResult> = {
  bronze_customers: {
    dataset_name: 'bronze_customers',
    sla_hours: 24,
    actual_update_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    expected_update_time: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    age_hours: 2.0,
    freshness_status: 'FRESH',
    freshness_score: 100,
    checked_at: new Date().toISOString(),
  },
  bronze_orders: {
    dataset_name: 'bronze_orders',
    sla_hours: 12,
    actual_update_time: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    expected_update_time: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    age_hours: 18.0,
    freshness_status: 'STALE',
    freshness_score: 45,
    checked_at: new Date().toISOString(),
  },
};

export const DEMO_RELIABILITY_SCORES: Record<string, ReliabilityScoreResponse> = {
  customers: {
    dataset_name: 'bronze_customers',
    quality_score: 100,
    freshness_score: 100,
    pipeline_score: 95,
    overall_score: 98.5,
    status: 'HEALTHY',
    recent_pipeline_runs: 10,
    successful_pipeline_runs: 10,
    persisted: true,
    reliability_record_id: 12,
    calculated_at: new Date().toISOString(),
  },
  orders: {
    dataset_name: 'bronze_orders',
    quality_score: 75,
    freshness_score: 45,
    pipeline_score: 70,
    overall_score: 64.5,
    status: 'DEGRADED',
    recent_pipeline_runs: 10,
    successful_pipeline_runs: 7,
    persisted: true,
    reliability_record_id: 13,
    calculated_at: new Date().toISOString(),
  },
};

export const DEMO_AI_ANALYSIS: AIAnalysisResponse = {
  incident_code: 'INC-2026-1042',
  dataset_name: 'bronze_orders',
  root_cause: 'Missing customer_id foreign keys in source CSV ingestion batch.',
  summary: '80 rows in data/source/orders.csv failed referential integrity validation against silver_customers.',
  recommendations: [
    'Verify customer master CSV ingestion ran prior to orders ingestion.',
    'Filter or quarantine orphan order records in silver_orders transformation.',
  ],
  confidence_score: 0.91,
};

export const DEMO_RAG_RESPONSE: RAGQueryResponse = {
  question: 'Why did the order ingestion pipeline fail?',
  answer:
    'DEMO MODE: Order ingestion failures typically occur when data/source/orders.csv contains missing customer_id values or malformed CSV delimiters, triggering an IntegrityError during Silver transformation.',
  citations: [
    {
      title: 'CSV Ingestion & Integrity Runbook',
      doc_id: 'DOC-CSV-01',
      snippet: 'All bronze CSV files must reside under data/source/ and pass foreign key validation.',
      score: 0.92,
    },
  ],
};

export const DEMO_AGENT_RESULT: AgentInvestigationResult = {
  investigation_id: 'demo-inv-101',
  question: 'Investigate the recent failure in the orders pipeline.',
  status: 'COMPLETED',
  root_cause: 'Orphan customer_id values in orders.csv triggered validation error in pipeline run 104.',
  recommendations: [
    'Re-ingest bronze_customers before running silver_orders ETL.',
    'Inspect data/source/orders.csv for empty customer_id cells.',
  ],
  steps_taken: [
    {
      step_number: 1,
      agent_role: 'Pipeline Run Inspector',
      action: 'Check recent failed runs for bronze_orders',
      output: 'Run #104 failed with IntegrityError on 80 rows.',
      duration_ms: 420,
    },
    {
      step_number: 2,
      agent_role: 'Remediation Synthesizer',
      action: 'Formulate operational recovery steps',
      output: 'Generated 2 remediation steps.',
      duration_ms: 380,
    },
  ],
  duration_seconds: 1.8,
  completed_at: new Date().toISOString(),
};

export const DEMO_AGENT_HISTORY: AgentInvestigationSummary[] = [
  {
    id: 1,
    task_id: 'demo-task-01',
    dataset_name: 'bronze_orders',
    question: 'Investigate the recent failure in the orders pipeline.',
    status: 'COMPLETED',
    duration_seconds: 1.8,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

export const DEMO_AGENT_METRICS: AgentMetricsResponse = {
  total_investigations: 12,
  completed_investigations: 11,
  failed_investigations: 1,
  avg_duration_seconds: 3.4,
  success_rate: 91.7,
};

export const DEMO_MODEL_STATUS: ModelStatusResponse = {
  model_name: 'RandomForestFailurePredictor',
  version: '1.0.0',
  status: 'READY',
  model_available: true,
  is_trained: true,
  feature_count: 17,
};

export const DEMO_PREDICTION_RESULT: PredictionResultResponse = {
  dataset_name: 'bronze_orders',
  failure_probability: 0.24,
  risk_category: 'LOW',
  predicted_failure: false,
  timestamp: new Date().toISOString(),
};

export const DEMO_PREDICTION_HISTORY: PredictionHistoryItem[] = [
  {
    id: 1,
    dataset_name: 'bronze_orders',
    pipeline_name: 'bronze_csv_ingestion',
    failure_probability: 0.24,
    risk_category: 'LOW',
    predicted_failure: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const DEMO_MODEL_EVALUATION: ModelEvaluationResponse = {
  roc_auc: 0.91,
  accuracy: 0.89,
  precision: 0.86,
  recall: 0.84,
  f1_score: 0.85,
  confusion_matrix: {
    true_positive: 42,
    false_positive: 7,
    true_negative: 118,
    false_negative: 8,
  },
};

export const DEMO_ROOT_INFO: RootResponse = {
  app_name: 'DataSentinel API (Demo Mode)',
  version: '1.0.0',
  status: 'demo',
  docs_url: 'http://127.0.0.1:8000/docs',
};

export const DEMO_HEALTH: HealthResponse = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
};

export const DEMO_DB_HEALTH: DatabaseHealthResponse = {
  status: 'connected',
  latency_ms: 4.1,
};

export const DEMO_PROMETHEUS_RAW = `# HELP datasentinel_requests_total Total HTTP requests (DEMO DATA)
# TYPE datasentinel_requests_total counter
datasentinel_requests_total{method="GET",status="200"} 42
`;
