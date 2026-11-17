# DataSentinel Frontend API Inventory

This document catalogs all FastAPI backend endpoints integrated into the DataSentinel React frontend (`src/services/api/*`), using native browser `fetch()` (`src/lib/api-client.ts` — **no Axios**), targeting `http://127.0.0.1:8000` (`VITE_API_BASE_URL`) by default.

> **Environment & Live Verification Notice**: In this workspace container, only the React frontend repository exists (Docker, FastAPI, PostgreSQL, Redis, Groq, and Pinecone are not running locally). Frontend TypeScript compilation, Vite production bundling, and client-side unit tests have been verified; live HTTP roundtrips against FastAPI are marked **Integrated (Frontend) / Live Test Blocked (Backend Offline)** until executed alongside the running FastAPI backend.

---

## 1. Authentication Domain (`backend/auth/routes.py` -> `src/services/api/authApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user | `RegisterRequest { username, email, password, role? }` (`DATA_ENGINEER`, `DATA_ANALYST`, `VIEWER`; no `full_name`, no self-assigned `ADMIN`) | `UserResponse { id, username, email, role, is_active?, created_at? }` | None | Integrated (Live test blocked: backend offline) |
| `POST` | `/auth/login` | Authenticate user & issue JWT | `application/x-www-form-urlencoded` (`OAuth2PasswordRequestForm`: `username`, `password`) | `TokenResponse { access_token, token_type }` | None | Integrated (Live test blocked: backend offline) |
| `GET` | `/auth/me` | Fetch authenticated user profile | None | `UserResponse { id, username, email, role, is_active?, created_at? }` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `GET` | `/auth/admin-test` | Verify administrative permissions | None | `AdminTestResponse { status?, message?, user?, role?, user_role?, timestamp? }` | Bearer JWT (`ADMIN`) | Integrated (Live test blocked: backend offline) |

---

## 2. Datasets Domain (`backend/api/datasets.py` -> `src/services/api/datasetsApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/datasets/` | List registered datasets | None | `DatasetItem[] { id, dataset_name, source_type, source_name, source_path, owner }` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `POST` | `/datasets/` | Register a CSV dataset (permitted backend addition) | `DatasetCreateRequest { dataset_name, source_type: 'CSV', source_name, source_path, owner? }` | `DatasetItem` | Bearer JWT (`ADMIN` / `DATA_ENGINEER`) | Integrated (Requires matching backend route when FastAPI runs) |

---

## 3. Ingestion Domain (`backend/ingestion/routes.py` -> `src/services/api/ingestionApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/ingestion/dataset` | Submit CSV dataset ingestion | Query: `dataset_name: string`; Optional JSON body: `FailurePredictionRequest` (17 features) | `IngestionResponse { run_id?, pipeline_run_id?, pipeline_name?, dataset_name, rows_ingested, status, prediction?, prediction_error? }` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 4. ETL & Transformations Domain (`backend/etl/routes.py`, `backend/etl/gold_routes.py` -> `src/services/api/etlApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/etl/silver/{dataset_type}` | Execute Silver layer transformation (`customers`, `products`, `orders`) | Path: `dataset_type` (no request body) | `SilverETLResponse { dataset_type, source_table, target_table, rows_read, rows_written, status }` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `POST` | `/etl/gold/build` | Build Gold business mart tables | None (no request body) | `GoldBuildResponse { status, tables_created, row_counts, unmatched_products? }` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 5. Data Quality Domain (`backend/quality/routes.py` -> `src/services/api/qualityApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/quality/check/{dataset_type}` | Run data quality checks (`customers`, `products`, `orders`) | Path: `dataset_type` (no request body) | `QualityCheckResult { dataset, table, rows_checked, checks_run, failed_checks, overall_status, results }` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 6. Freshness Domain (`backend/freshness/routes.py` -> `src/services/api/freshnessApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/freshness/check/{dataset_name}` | Check dataset update SLA (`bronze_customers`, `bronze_products`, `bronze_orders`) | Path: `dataset_name` (no request body) | `FreshnessResult { dataset_name, sla_hours, actual_update_time, expected_update_time, age_hours, freshness_status, freshness_score, checked_at }` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 7. Reliability Domain (`backend/reliability/routes.py` -> `src/services/api/reliabilityApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/reliability/calculate/{dataset_type}` | Calculate composite reliability score (`customers`, `products`, `orders`) | Path: `dataset_type` (no request body) | `ReliabilityScoreResponse { dataset_name, quality_score, freshness_score, pipeline_score, overall_score, status, recent_pipeline_runs, successful_pipeline_runs, persisted, reliability_record_id?, calculated_at }` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 8. Incident Management Domain (`backend/incidents/routes.py` -> `src/services/api/incidentsApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/incidents/detect/{dataset_name}` | Detect dataset incidents | Path: `dataset_name` (no body) | `IncidentDetectResponse` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `POST` | `/incidents/detect-pipeline-failures/{dataset_name}` | Detect pipeline failure incidents | Path: `dataset_name` (no body) | `PipelineFailureDetectResponse` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `GET` | `/incidents/` | List incidents | Query: `status?` | `IncidentItem[]` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `PATCH` | `/incidents/{incident_code}/resolve` | Resolve an open incident | Path: `incident_code` (no body) | `IncidentItem` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 9. AI Analysis Domain (`backend/ai/routes.py` -> `src/services/api/aiAnalysisApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/ai-analysis/demo` | Run AI diagnostic demo | `AIAnalysisDemoRequest { dataset_name, incident_type, severity, description, pipeline_status, error_message }` | `AIAnalysisResponse` | Bearer JWT | Integrated (Live test blocked: backend/Groq offline) |
| `POST` | `/ai-analysis/{incident_code}` | Run LLM diagnostic on stored incident | Path: `incident_code` | `AIAnalysisResponse` | Bearer JWT | Integrated (Live test blocked: backend/Groq offline) |

---

## 10. RAG Knowledge Assistant Domain (`backend/rag/routes.py` -> `src/services/api/ragApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/rag/ask` | Submit question to Pinecone/Groq RAG pipeline | `RAGQueryRequest { question }` | `RAGQueryResponse { question?, answer, citations?, sources?, model? }` | Bearer JWT | Integrated (Live test blocked: backend/Pinecone/Groq offline) |

---

## 11. Agent Investigations Domain (`backend/agents/routes.py` -> `src/services/api/agentsApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/agent/investigate` | Run synchronous LangGraph investigation | `AgentInvestigateRequest { question }` | `AgentInvestigationResult` | Bearer JWT | Integrated (Live test blocked: backend/Redis/Groq offline) |
| `POST` | `/agent/investigate/async` | Queue asynchronous Celery investigation | `AgentInvestigateRequest { question }` | `AsyncTaskResponse { task_id, status }` | Bearer JWT | Integrated (Live test blocked: backend/Redis/Celery offline) |
| `GET` | `/agent/tasks/{task_id}` | Poll async investigation task status | Path: `task_id` | `TaskStatusResponse` | Bearer JWT | Integrated (Live test blocked: backend/Redis offline) |
| `GET` | `/agent/history` | View historical investigations | Query: `limit?`, `offset?`, `status?`, `dataset_name?` | `AgentInvestigationSummary[]` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `POST` | `/agent/maintenance/recover-stale` | Recover stale Celery investigation tasks | Query: `timeout_minutes` (default 30) | `RecoverStaleResponse` | Bearer JWT (`ADMIN`) | Integrated (Live test blocked: backend/Redis offline) |
| `GET` | `/agent/metrics` | Retrieve operational agent metrics | None | `AgentMetricsResponse` | Bearer JWT (`ADMIN`) | Integrated (Live test blocked: backend offline) |

---

## 12. Failure Prediction Domain (`backend/prediction/routes.py` -> `src/services/api/predictionsApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/predictions/failure/model-status` | Check trained ML model status | None | `ModelStatusResponse` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `POST` | `/predictions/failure/{dataset_name}` | Predict pipeline failure probability | Path: `dataset_name`, Body: `FailurePredictionRequest` (17 numeric/string features) | `PredictionResultResponse { failure_probability, risk_category?, predicted_failure?, ... }` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `GET` | `/predictions/failure/{dataset_name}/history` | Retrieve historical predictions | Path: `dataset_name` | `PredictionHistoryItem[]` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `GET` | `/predictions/evaluation` | Retrieve model evaluation metrics | None | `ModelEvaluationResponse` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 13. Pipeline Runs Domain (`backend/pipeline_runs/routes.py` -> `src/services/api/pipelineRunsApi.ts`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/pipeline-runs` | List pipeline runs | Query: `dataset_name?`, `status?`, `limit?`, `offset?` | `PipelineRunItem[]` (`run_id` is integer) | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `GET` | `/pipeline-runs/summary` | Aggregated pipeline summary | None | `PipelineSummaryResponse` | Bearer JWT | Integrated (Live test blocked: backend offline) |
| `GET` | `/pipeline-runs/{run_id}` | Inspect specific run details | Path: `run_id: number` | `PipelineRunDetail` | Bearer JWT | Integrated (Live test blocked: backend offline) |

---

## 14. System Health & Prometheus Metrics (`backend/main.py`, `backend/monitoring/prometheus_metrics.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Root API metadata | None | `RootResponse` | None | Integrated (Live test blocked: backend offline) |
| `GET` | `/health` | FastAPI liveness check | None | `HealthResponse` | None | Integrated (Live test blocked: backend offline) |
| `GET` | `/health/database` | PostgreSQL connectivity check | None | `DatabaseHealthResponse` (throws HTTP 503 if DB unreachable; rendered as unhealthy) | None | Integrated (Live test blocked: backend/Postgres offline) |
| `GET` | `/metrics` | Prometheus text exposition metrics | None | Plaintext (`text/plain`) parsed by `parsePrometheusText` | None | Integrated (Live test blocked: backend offline) |

---

## Live-by-Default & Demo Isolation Policy

1. **Live Backend by Default**: `isDemoMode()` defaults to `false`. Every API call dispatches directly to `VITE_API_BASE_URL` (`http://127.0.0.1:8000`) using native `fetch()`.
2. **No Silent Fallback**: Network errors, HTTP `401`, `403`, `422`, and `503` responses raise `ApiError` and display real error banners/toasts.
3. **Explicit Isolated Demo Mode**: Users can explicitly toggle **Demo Mode** from the login page or header to inspect the UI with `DEMO_*` fixtures (`src/mocks/fixtures.ts`). Switching modes clears the TanStack Query cache so demo and live data never mix.
