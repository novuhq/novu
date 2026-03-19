import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import {
  DELIVERY_TREND_COUNTS_ORDER_BY,
  DELIVERY_TREND_COUNTS_TABLE_NAME,
  DeliveryTrendCount,
  deliveryTrendCountsSchema,
} from './delivery-trend-counts.schema';

@Injectable()
export class DeliveryTrendCountsRepository extends LogRepository<
  typeof deliveryTrendCountsSchema,
  DeliveryTrendCount
> {
  public readonly table = DELIVERY_TREND_COUNTS_TABLE_NAME;
  public readonly identifierPrefix = 'dtc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(
      clickhouseService,
      logger,
      deliveryTrendCountsSchema,
      DELIVERY_TREND_COUNTS_ORDER_BY,
      featureFlagsService
    );
    this.logger.setContext(this.constructor.name);
  }

  async getDeliveryTrendData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ date: string; step_type: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        date,
        step_type,
        sum(count) as count
      FROM ${DELIVERY_TREND_COUNTS_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
      GROUP BY date, step_type
      ORDER BY date, step_type
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    if (workflowIds && workflowIds.length > 0) {
      params.workflowIds = workflowIds;
    }

    const result = await this.clickhouseService.query<{
      date: string;
      step_type: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }
}
