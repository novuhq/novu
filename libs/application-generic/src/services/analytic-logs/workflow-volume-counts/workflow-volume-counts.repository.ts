import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import {
  WORKFLOW_VOLUME_COUNTS_ORDER_BY,
  WORKFLOW_VOLUME_COUNTS_TABLE_NAME,
  WorkflowVolumeCount,
  workflowVolumeCountsSchema,
} from './workflow-volume-counts.schema';

@Injectable()
export class WorkflowVolumeCountsRepository extends LogRepository<
  typeof workflowVolumeCountsSchema,
  WorkflowVolumeCount
> {
  public readonly table = WORKFLOW_VOLUME_COUNTS_TABLE_NAME;
  public readonly identifierPrefix = 'wvc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, workflowVolumeCountsSchema, WORKFLOW_VOLUME_COUNTS_ORDER_BY, featureFlagsService);
    this.logger.setContext(this.constructor.name);
  }

  async getWorkflowVolumeData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ workflow_name: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        workflow_name,
        sum(count) as count
      FROM ${WORKFLOW_VOLUME_COUNTS_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
      GROUP BY workflow_name
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
      workflow_name: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }
}
