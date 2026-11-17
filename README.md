# DataSentinel — Enterprise Data Reliability & Observability Platform

DataSentinel is a React + TypeScript + Vite frontend for the DataSentinel FastAPI reliability and observability backend. It provides CSV ingestion workflows, Bronze-Silver-Gold ETL triggers, data quality and freshness SLA monitoring, composite reliability scoring, incident management, pipeline run inspection, gradient-boosted failure risk prediction, AI incident diagnostics, RAG knowledge retrieval, and LangGraph agent investigations.

---

## Technology Stack

- **Framework**: React 19, TypeScript, Vite (port `3000`)
- **Styling**: Tailwind CSS, Lucide React icons
- **State & Server Cache**: TanStack Query (`@tanstack/react-query`)
- **Forms & Validation**: React Hook Form + Zod
- **Routing**: React Router DOM v7
- **Visualizations**: Recharts
- **HTTP Client**: Centralized native browser `fetch()` wrapper (`src/lib/api-client.ts`) — **no Axios**

---

## Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default variables:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_TIMEOUT=15000
```

### 2. Install & Run Frontend (Port 3000)

```bash
npm install
npm run dev
```

Frontend serves at `http://localhost:3000`.

### 3. Run FastAPI Backend (Port 8000)

From the backend project root:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API & Swagger docs:
- API: `http://127.0.0.1:8000`
- OpenAPI / Swagger UI: `http://127.0.0.1:8000/docs`

---

## Live Backend Mode vs. Isolated Demo Mode

- **Live Mode (Default)**: All API calls target `http://127.0.0.1:8000` via native `fetch()`. Failed requests, validation errors (`422`), permission denials (`403`), and database outages (`503` on `/health/database`) are surfaced directly in the UI without silent fallback to mock data.
- **Explicit Demo Mode**: When exploring the UI without a running FastAPI/PostgreSQL/Redis/Groq/Pinecone stack, users can explicitly switch to **Demo Mode** on the Login page or header toggle. All demo views display a `DEMO DATA` badge and clear the query cache when switching modes.

---

## Role-Based Access Control (RBAC)

Authentication uses real OAuth2 password grant (`application/x-www-form-urlencoded` to `POST /auth/login`) and JWT Bearer tokens verified via `GET /auth/me`.

- **ADMIN**: Full platform access including `GET /auth/admin-test`, `GET /agent/metrics`, `POST /agent/maintenance/recover-stale`, and `POST /datasets/`.
- **DATA_ENGINEER**: Dataset registration, CSV ingestion, ETL operations, quality/freshness/reliability checks, failure predictions, and incident workflows.
- **DATA_ANALYST / VIEWER**: Read/observability dashboards, incident viewing, AI/RAG/agent queries, and run inspection (protected backend mutations enforce role checks server-side).

---

## Verification Commands

```bash
# TypeScript type-check
npm run lint

# Production Vite build
npm run build

# Unit tests
npx tsx --test src/__tests__/api_and_workflows.test.ts
```

See [`docs/frontend-api-inventory.md`](docs/frontend-api-inventory.md) for the complete endpoint mapping and schema reference.
