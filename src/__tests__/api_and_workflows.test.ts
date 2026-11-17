import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePrometheusText } from '../services/api/metricsApi';
import {
  DEMO_PROMETHEUS_RAW,
  DEMO_USERS,
  DEMO_DATASETS,
  DEMO_INCIDENTS,
} from '../mocks/fixtures';
import { ApiError, API_BASE_URL, formatApiError, isDemoMode } from '../lib/api-client';

describe('DataSentinel Integration & Core Workflows', () => {
  it('defaults to live backend on port 8000 and demo mode disabled', () => {
    assert.strictEqual(API_BASE_URL, 'http://127.0.0.1:8000');
    assert.strictEqual(isDemoMode(), false);
  });

  it('parses Prometheus raw metrics text format into structured data', () => {
    const sample = `${DEMO_PROMETHEUS_RAW}
# HELP datasentinel_pipeline_runs_total Pipeline runs by status
# TYPE datasentinel_pipeline_runs_total counter
datasentinel_pipeline_runs_total{status="success"} 139
datasentinel_pipeline_runs_total{status="failed"} 5
# HELP datasentinel_db_connection_latency_seconds Database latency
# TYPE datasentinel_db_connection_latency_seconds gauge
datasentinel_db_connection_latency_seconds 0.0034
`;
    const parsed = parsePrometheusText(sample);
    assert(parsed.length >= 4, `Expected at least 4 parsed metrics, got ${parsed.length}`);

    const successMetric = parsed.find(
      (m) => m.name === 'datasentinel_pipeline_runs_total' && m.labels?.status === 'success'
    );
    assert.strictEqual(successMetric?.value, 139);

    const latencyMetric = parsed.find((m) => m.name === 'datasentinel_db_connection_latency_seconds');
    assert.strictEqual(latencyMetric?.value, 0.0034);
  });

  it('verifies demo dataset inventory fixtures match backend DatasetItem schema', () => {
    assert(DEMO_DATASETS.length >= 3, 'Should contain core datasets');
    for (const ds of DEMO_DATASETS) {
      assert(typeof ds.id === 'number', 'Dataset must have numeric id');
      assert(ds.dataset_name, 'Dataset must have dataset_name');
      assert.strictEqual(ds.source_type, 'CSV', 'Source type must be CSV');
      assert(ds.source_name, 'Dataset must have source_name');
      assert(ds.source_path.startsWith('data/source/'), 'Source path must be inside data/source/');
      assert(ds.owner, 'Dataset must have owner');
    }
  });

  it('formats ApiError and standard errors accurately without Axios', () => {
    const apiErr = new ApiError('body.dataset_name: field required', { status: 422 });
    assert.strictEqual(formatApiError(apiErr), 'body.dataset_name: field required');
    assert.strictEqual(apiErr.status, 422);

    const db503 = new ApiError('Service Unavailable (503): Database unreachable', { status: 503 });
    assert.strictEqual(db503.status, 503);
    assert(formatApiError(db503).includes('503'));
  });

  it('validates uppercase RBAC user roles', () => {
    assert.strictEqual(DEMO_USERS.ADMIN.role, 'ADMIN');
    assert.strictEqual(DEMO_USERS.DATA_ENGINEER.role, 'DATA_ENGINEER');
    assert.strictEqual(DEMO_USERS.DATA_ANALYST.role, 'DATA_ANALYST');
  });

  it('validates incident severity and status contracts', () => {
    for (const inc of DEMO_INCIDENTS) {
      assert(inc.incident_code.startsWith('INC-'), 'Incident code must start with INC-');
      assert(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(inc.severity), 'Valid uppercase severity');
      assert(['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].includes(inc.status), 'Valid uppercase status');
    }
  });
});
