import { apiFetch, executeApi } from '../../lib/api-client';
import {
  DatasetDomainType,
  SilverETLResponse,
  GoldBuildResponse,
} from '../../types/api';

export const etlApi = {
  async triggerSilverETL(
    datasetType: DatasetDomainType | string
  ): Promise<{ data: SilverETLResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<SilverETLResponse>(
          `/etl/silver/${encodeURIComponent(datasetType)}`,
          { method: 'POST' }
        ),
      () => ({
        dataset_type: datasetType,
        source_table: `bronze_${datasetType}`,
        target_table: `silver_${datasetType}`,
        rows_read: 1500,
        rows_written: 1485,
        status: 'SUCCESS',
      })
    );
  },

  async triggerGoldBuild(): Promise<{ data: GoldBuildResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<GoldBuildResponse>('/etl/gold/build', {
          method: 'POST',
        }),
      () => ({
        status: 'SUCCESS',
        tables_created: ['gold_customer_summary', 'gold_product_performance', 'gold_daily_sales'],
        row_counts: {
          gold_customer_summary: 498,
          gold_product_performance: 120,
          gold_daily_sales: 90,
        },
        unmatched_products: 0,
      })
    );
  },
};
