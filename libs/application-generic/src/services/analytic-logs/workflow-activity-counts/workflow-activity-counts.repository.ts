import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import {
  WORKFLOW_ACTIVITY_COUNTS_ORDER_BY,
  WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME,
  WorkflowActivityCount,
  workflowActivityCountsSchema,
} from './workflow-activity-counts.schema';

@Injectable()
export class WorkflowActivityCountsRepository extends LogRepository<
  typeof workflowActivityCountsSchema,
  WorkflowActivityCount
> {
  public readonly table = WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME;
  public readonly identifierPrefix = 'wac_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(
      clickhouseService,
      logger,
      workflowActivityCountsSchema,
      WORKFLOW_ACTIVITY_COUNTS_ORDER_BY,
      featureFlagsService
    );
    this.logger.setContext(this.constructor.name);
  }

  async getMessageSendCount(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date,
    workflowIds?: string[]
  ): Promise<{ currentPeriod: number; previousPeriod: number }> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? `AND workflow_id IN {workflowIds:Array(String)}` : '';

    const currentQuery = `
      SELECT sum(count) as count
      FROM ${WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
    `;

    const previousQuery = `
      SELECT sum(count) as count
      FROM ${WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND date >= {previousStartDate:Date}
        AND date <= {previousEndDate:Date}
        ${workflowFilter}
    `;

    const currentParams: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const previousParams: Record<string, unknown> = {
      environmentId,
      organizationId,
      previousStartDate: previousStartDate.toISOString().split('T')[0],
      previousEndDate: previousEndDate.toISOString().split('T')[0],
    };

    if (workflowIds && workflowIds.length > 0) {
      currentParams.workflowIds = workflowIds;
      previousParams.workflowIds = workflowIds;
    }

    const [currentResult, previousResult] = await Promise.all([
      this.clickhouseService.query<{ count: string }>({
        query: currentQuery,
        params: currentParams,
      }),
      this.clickhouseService.query<{ count: string }>({
        query: previousQuery,
        params: previousParams,
      }),
    ]);

    const currentPeriod = parseInt(currentResult.data[0]?.count || '0', 10);
    const previousPeriod = parseInt(previousResult.data[0]?.count || '0', 10);

    return {
      currentPeriod,
      previousPeriod,
    };
  }

  async getActiveSubscribersCount(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date,
    workflowIds?: string[]
  ): Promise<{ currentPeriod: number; previousPeriod: number }> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? `AND workflow_id IN {workflowIds:Array(String)}` : '';

    const currentQuery = `
      SELECT count(DISTINCT external_subscriber_id) as count
      FROM ${WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND external_subscriber_id != ''
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
    `;

    const previousQuery = `
      SELECT count(DISTINCT external_subscriber_id) as count
      FROM ${WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND external_subscriber_id != ''
        AND date >= {previousStartDate:Date}
        AND date <= {previousEndDate:Date}
        ${workflowFilter}
    `;

    const currentParams: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const previousParams: Record<string, unknown> = {
      environmentId,
      organizationId,
      previousStartDate: previousStartDate.toISOString().split('T')[0],
      previousEndDate: previousEndDate.toISOString().split('T')[0],
    };

    if (workflowIds && workflowIds.length > 0) {
      currentParams.workflowIds = workflowIds;
      previousParams.workflowIds = workflowIds;
    }

    const [currentResult, previousResult] = await Promise.all([
      this.clickhouseService.query<{ count: string }>({
        query: currentQuery,
        params: currentParams,
      }),
      this.clickhouseService.query<{ count: string }>({
        query: previousQuery,
        params: previousParams,
      }),
    ]);

    const currentPeriod = parseInt(currentResult.data[0]?.count || '0', 10);
    const previousPeriod = parseInt(previousResult.data[0]?.count || '0', 10);

    return {
      currentPeriod,
      previousPeriod,
    };
  }

  async getActiveSubscribersTrendData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ date: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        date,
        count(DISTINCT external_subscriber_id) as count
      FROM ${WORKFLOW_ACTIVITY_COUNTS_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND external_subscriber_id != ''
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
      GROUP BY date
      ORDER BY date
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
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }
}
