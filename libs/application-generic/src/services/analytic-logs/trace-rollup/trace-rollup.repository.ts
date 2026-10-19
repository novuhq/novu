import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import { TRACE_ROLLUP_ORDER_BY, TRACE_ROLLUP_TABLE_NAME, TraceRollup, traceRollupSchema } from './trace-rollup.schema';

function getDateOnlyPreviousEndDate(startDate: Date): string {
  const adjustedDate = new Date(startDate);
  adjustedDate.setDate(adjustedDate.getDate() - 1);

  return adjustedDate.toISOString().split('T')[0];
}

@Injectable()
export class TraceRollupRepository extends LogRepository<typeof traceRollupSchema, TraceRollup> {
  public readonly table = TRACE_ROLLUP_TABLE_NAME;
  public readonly identifierPrefix = 'tr_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, traceRollupSchema, TRACE_ROLLUP_ORDER_BY, featureFlagsService);
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
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type = 'message_sent'
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
    `;

    const previousQuery = `
      SELECT sum(count) as count
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type = 'message_sent'
        AND date >= {previousStartDate:Date}
        AND date <= {previousEndDate:Date}
        ${workflowFilter}
    `;

    const adjustedPreviousEndDate = getDateOnlyPreviousEndDate(startDate);

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
      previousEndDate: adjustedPreviousEndDate,
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
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type = 'message_sent'
        AND external_subscriber_id != ''
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
    `;

    const previousQuery = `
      SELECT count(DISTINCT external_subscriber_id) as count
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type = 'message_sent'
        AND external_subscriber_id != ''
        AND date >= {previousStartDate:Date}
        AND date <= {previousEndDate:Date}
        ${workflowFilter}
    `;

    const adjustedPreviousEndDate = getDateOnlyPreviousEndDate(startDate);

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
      previousEndDate: adjustedPreviousEndDate,
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
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND event_type = 'message_sent'
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

  async getAvgMessagesPerSubscriberData(
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
      SELECT 
        sum(count) as total_messages,
        count(DISTINCT external_subscriber_id) as unique_subscribers
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type = 'message_sent'
        AND external_subscriber_id != ''
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
    `;

    const previousQuery = `
      SELECT 
        sum(count) as total_messages,
        count(DISTINCT external_subscriber_id) as unique_subscribers
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type = 'message_sent'
        AND external_subscriber_id != ''
        AND date >= {previousStartDate:Date}
        AND date <= {previousEndDate:Date}
        ${workflowFilter}
    `;

    const adjustedPreviousEndDate = getDateOnlyPreviousEndDate(startDate);

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
      previousEndDate: adjustedPreviousEndDate,
    };

    if (workflowIds && workflowIds.length > 0) {
      currentParams.workflowIds = workflowIds;
      previousParams.workflowIds = workflowIds;
    }

    const [currentResult, previousResult] = await Promise.all([
      this.clickhouseService.query<{ total_messages: string; unique_subscribers: string }>({
        query: currentQuery,
        params: currentParams,
      }),
      this.clickhouseService.query<{ total_messages: string; unique_subscribers: string }>({
        query: previousQuery,
        params: previousParams,
      }),
    ]);

    const currentTotalMessages = parseInt(currentResult.data[0]?.total_messages || '0', 10);
    const currentUniqueSubscribers = parseInt(currentResult.data[0]?.unique_subscribers || '0', 10);
    const previousTotalMessages = parseInt(previousResult.data[0]?.total_messages || '0', 10);
    const previousUniqueSubscribers = parseInt(previousResult.data[0]?.unique_subscribers || '0', 10);

    const currentPeriod = currentUniqueSubscribers > 0 ? currentTotalMessages / currentUniqueSubscribers : 0;
    const previousPeriod = previousUniqueSubscribers > 0 ? previousTotalMessages / previousUniqueSubscribers : 0;

    return {
      currentPeriod: Math.round(currentPeriod * 100) / 100,
      previousPeriod: Math.round(previousPeriod * 100) / 100,
    };
  }

  async getTotalInteractionsCount(
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
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type IN ('message_seen', 'message_read', 'message_snoozed', 'message_archived')
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
    `;

    const previousQuery = `
      SELECT sum(count) as count
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND environment_id = {environmentId:String}
        AND event_type IN ('message_seen', 'message_read', 'message_snoozed', 'message_archived')
        AND date >= {previousStartDate:Date}
        AND date <= {previousEndDate:Date}
        ${workflowFilter}
    `;

    const adjustedPreviousEndDate = getDateOnlyPreviousEndDate(startDate);

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
      previousEndDate: adjustedPreviousEndDate,
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

  async getInteractionTrendData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    workflowIds?: string[]
  ): Promise<Array<{ date: string; event_type: string; count: string }>> {
    const workflowFilter =
      workflowIds && workflowIds.length > 0 ? 'AND workflow_id IN {workflowIds:Array(String)}' : '';

    const query = `
      SELECT 
        date,
        event_type,
        sum(count) as count
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND event_type IN ('message_seen', 'message_read', 'message_snoozed', 'message_archived')
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        ${workflowFilter}
      GROUP BY date, event_type
      ORDER BY date, event_type
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
      event_type: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getUsageReportScalarStats(
    environmentIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{
    messagesSentCount: number;
    uniqueSubscribers: number;
    interactions: number;
  }> {
    if (environmentIds.length === 0) {
      this.logger.info(
        { method: 'getUsageReportScalarStats' },
        'Skipping trace rollup query: environmentIds is empty (prevents invalid IN clause)'
      );

      return {
        messagesSentCount: 0,
        uniqueSubscribers: 0,
        interactions: 0,
      };
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const query = `
      SELECT
        sumIf(count, event_type = 'message_sent') as messages_sent_count,
        countDistinctIf(external_subscriber_id, event_type = 'message_sent' AND external_subscriber_id != '') as unique_subscribers,
        sumIf(count, event_type IN (
          'message_seen', 'message_read', 'message_snoozed', 'message_archived'
        )) as interactions
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        environment_id IN {environmentIds:Array(String)}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
    `;

    const params: Record<string, unknown> = {
      environmentIds,
      startDate: startDateStr,
      endDate: endDateStr,
    };

    const result = await this.clickhouseService.query<{
      messages_sent_count: string;
      unique_subscribers: string;
      interactions: string;
    }>({
      query,
      params,
    });

    const data = result.data[0] || {
      messages_sent_count: '0',
      unique_subscribers: '0',
      interactions: '0',
    };

    return {
      messagesSentCount: parseInt(data.messages_sent_count, 10),
      uniqueSubscribers: parseInt(data.unique_subscribers, 10),
      interactions: parseInt(data.interactions, 10),
    };
  }

  async getUsageReportBreakdown(
    environmentIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ provider_id: string; count: string }>> {
    if (environmentIds.length === 0) {
      this.logger.info(
        { method: 'getUsageReportBreakdown' },
        'Skipping trace rollup query: environmentIds is empty (prevents invalid IN clause)'
      );

      return [];
    }

    const query = `
      SELECT
        provider_id,
        sum(count) AS count
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE
        environment_id IN {environmentIds:Array(String)}
        AND event_type = 'message_sent'
        AND provider_id != ''
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
      GROUP BY provider_id
    `;

    const params: Record<string, unknown> = {
      environmentIds,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const result = await this.clickhouseService.query<{ provider_id: string; count: string }>({
      query,
      params,
    });

    return result.data;
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
      FROM ${TRACE_ROLLUP_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND event_type = 'message_sent'
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
