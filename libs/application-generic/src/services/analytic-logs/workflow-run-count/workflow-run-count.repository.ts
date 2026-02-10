import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import {
  WORKFLOW_RUN_COUNT_ORDER_BY,
  WORKFLOW_RUN_COUNT_TABLE_NAME,
  WorkflowRunCount,
  workflowRunCountSchema,
} from './workflow-run-count.schema';

@Injectable()
export class WorkflowRunCountRepository extends LogRepository<typeof workflowRunCountSchema, WorkflowRunCount> {
  public readonly table = WORKFLOW_RUN_COUNT_TABLE_NAME;
  public readonly identifierPrefix = 'wrc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, workflowRunCountSchema, WORKFLOW_RUN_COUNT_ORDER_BY, featureFlagsService);
    this.logger.setContext(this.constructor.name);
  }

  async getWorkflowRunEventCounts(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowRunIds?: string[]
  ): Promise<Array<{ workflow_run_id: string; event_type: string; count: string }>> {
    const workflowRunFilter =
      workflowRunIds && workflowRunIds.length > 0 ? 'AND workflow_run_id IN {workflowRunIds:Array(String)}' : '';

    const query = `
      SELECT 
        workflow_run_id,
        event_type,
        sum(count) as count
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowRunFilter}
      GROUP BY workflow_run_id, event_type
      ORDER BY workflow_run_id, event_type
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    if (workflowRunIds && workflowRunIds.length > 0) {
      params.workflowRunIds = workflowRunIds;
    }

    const result = await this.clickhouseService.query<{
      workflow_run_id: string;
      event_type: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getWorkflowRunEventTrend(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    eventType: string
  ): Promise<Array<{ date: string; count: string }>> {
    const query = `
      SELECT 
        date,
        sum(count) as count
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND event_type = {eventType:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
      GROUP BY date
      ORDER BY date
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      eventType,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const result = await this.clickhouseService.query<{
      date: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }
}
