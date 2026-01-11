import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import {
  PROVIDER_VOLUME_COUNTS_ORDER_BY,
  PROVIDER_VOLUME_COUNTS_TABLE_NAME,
  ProviderVolumeCount,
  providerVolumeCountsSchema,
} from './provider-volume-counts.schema';

@Injectable()
export class ProviderVolumeCountsRepository extends LogRepository<
  typeof providerVolumeCountsSchema,
  ProviderVolumeCount
> {
  public readonly table = PROVIDER_VOLUME_COUNTS_TABLE_NAME;
  public readonly identifierPrefix = 'pvc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(
      clickhouseService,
      logger,
      providerVolumeCountsSchema,
      PROVIDER_VOLUME_COUNTS_ORDER_BY,
      featureFlagsService
    );
    this.logger.setContext(this.constructor.name);
  }

  async getProviderVolumeData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ provider_id: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        provider_id,
        sum(count) as count
      FROM ${PROVIDER_VOLUME_COUNTS_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
      GROUP BY provider_id
      ORDER BY count DESC
      LIMIT 5
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
      provider_id: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }
}
