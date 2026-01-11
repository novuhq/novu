import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import {
  MESSAGE_SENT_COUNTS_ORDER_BY,
  MESSAGE_SENT_COUNTS_TABLE_NAME,
  MessageSentCount,
  messageSentCountsSchema,
} from './message-sent-counts.schema';

@Injectable()
export class MessageSentCountsRepository extends LogRepository<typeof messageSentCountsSchema, MessageSentCount> {
  public readonly table = MESSAGE_SENT_COUNTS_TABLE_NAME;
  public readonly identifierPrefix = 'msc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, messageSentCountsSchema, MESSAGE_SENT_COUNTS_ORDER_BY, featureFlagsService);
    this.logger.setContext(this.constructor.name);
  }

  async getMessagesSentData(
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
      FROM ${MESSAGE_SENT_COUNTS_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
    `;

    const previousQuery = `
      SELECT sum(count) as count
      FROM ${MESSAGE_SENT_COUNTS_TABLE_NAME}
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
}
