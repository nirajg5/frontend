import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_QUALITY_RESULT } from '../../mocks/fixtures';
import { QualityCheckResult } from '../../types/api';

export const qualityApi = {
  async runQualityCheck(
    datasetType: string
  ): Promise<{ data: QualityCheckResult; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<QualityCheckResult>(
          `/quality/check/${encodeURIComponent(datasetType)}`,
          { method: 'POST' }
        ),
      () =>
        DEMO_QUALITY_RESULT[datasetType] || {
          dataset: datasetType,
          table: `silver_${datasetType}`,
          rows_checked: 300,
          checks_run: 3,
          failed_checks: 0,
          overall_status: 'PASS',
          results: [
            { check_name: 'non_empty_table', status: 'PASS', failed_rows: 0 },
            { check_name: 'primary_key_not_null', status: 'PASS', failed_rows: 0 },
            { check_name: 'primary_key_unique', status: 'PASS', failed_rows: 0 },
          ],
        }
    );
  },
};
