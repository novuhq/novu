import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { inclusiveUtcDayBounds, toInclusiveUtcDays, toUtcDay } from '../inclusive-utc-days';
import { LogRepository } from '../log.repository';
import { TABLE_NAME as TRACES_TABLE_NAME } from '../trace-log/trace-log.schema';
import {
  WORKFLOW_RUN_COUNT_ORDER_BY,
  WORKFLOW_RUN_COUNT_TABLE_NAME,
  WorkflowRunCount,
  workflowRunCountSchema,
} from './workflow-run-count.schema';

/** Tags the edge-day traces query in ClickHouse `system.query_log`. */
export const EDGE_DAY_CORRECTION_LOG_COMMENT = 'workflow_run_count_edge_day_correction';

export interface DailyWorkflowRunUsage {
  /** UTC calendar day as `YYYY-MM-DD`. */
  day: string;
  count: number;
}

export interface ExactRangeFromDailyUsageQuery {
  organizationId: string;
  /** The organization's rows from `getPlatformDailyUsageByWholeUtcDays`, read over a range ending in the future. */
  dailyUsage: DailyWorkflowRunUsage[];
  /** `startDate` of the range `dailyUsage` was read over. */
  dailyUsageFrom: Date;
  startDate: Date;
  endDate: Date;
}

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

  async getTotalInteractionsCount(environmentIds: string[], startDate: Date, endDate: Date): Promise<number> {
    if (environmentIds.length === 0) {
      this.logger.info(
        { method: 'getTotalInteractionsCount' },
        'Skipping workflow run count query: environmentIds is empty (prevents invalid IN clause)'
      );

      return 0;
    }

    const query = `
      SELECT sum(count) as total
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id IN {environmentIds:Array(String)}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type = 'workflow_run_delivery_interacted'
    `;

    const params: Record<string, unknown> = {
      environmentIds,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const result = await this.clickhouseService.query<{ total: string }>({
      query,
      params,
    });

    return parseInt(result.data[0]?.total || '0', 10);
  }

  async getTopWorkflows(
    environmentIds: string[],
    startDate: Date,
    endDate: Date,
    limit: number = 5
  ): Promise<Array<{ workflow_run_id: string; count: string }>> {
    if (environmentIds.length === 0) {
      this.logger.info(
        { method: 'getTopWorkflows' },
        'Skipping workflow run count query: environmentIds is empty (prevents invalid IN clause)'
      );

      return [];
    }

    const query = `
      SELECT 
        workflow_run_id,
        sum(count) as count
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id IN {environmentIds:Array(String)}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type = 'workflow_run_delivery_sent'
      GROUP BY workflow_run_id
      ORDER BY count DESC
      LIMIT {limit:UInt32}
    `;

    const params: Record<string, unknown> = {
      environmentIds,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit,
    };

    const result = await this.clickhouseService.query<{
      workflow_run_id: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getUsageReportStats(
    environmentIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCreated: number;
    totalRuns: number;
  }> {
    if (environmentIds.length === 0) {
      this.logger.info(
        { method: 'getUsageReportStats' },
        'Skipping workflow run count query: environmentIds is empty (prevents invalid IN clause)'
      );

      return { totalCreated: 0, totalRuns: 0 };
    }

    const query = `
      SELECT 
        sumIf(count, event_type = 'workflow_run_status_processing') as total_created,
        sumIf(count, event_type = 'workflow_run_status_completed') as succeeded,
        sumIf(count, event_type = 'workflow_run_status_error') as failed
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id IN {environmentIds:Array(String)}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type IN (
          'workflow_run_status_processing',
          'workflow_run_status_completed',
          'workflow_run_status_error'
        )
    `;

    const params: Record<string, unknown> = {
      environmentIds,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const result = await this.clickhouseService.query<{
      total_created: string;
      succeeded: string;
      failed: string;
    }>({
      query,
      params,
    });

    const stats = result.data[0] || {
      total_created: '0',
      succeeded: '0',
      failed: '0',
    };

    const totalCreated = parseInt(stats.total_created, 10);
    const succeeded = parseInt(stats.succeeded, 10);
    const failed = parseInt(stats.failed, 10);
    const totalRuns = succeeded + failed;

    return {
      totalCreated,
      totalRuns,
    };
  }

  /**
   * Processing workflow runs per organization from the daily `workflow_run_count` buckets.
   *
   * Counts every UTC day the half-open range `[startDate, endDate)` touches in full:
   * `date >= toDate(start) AND date <= toDate(end - 1ms)`. A midnight exclusive end (e.g. Stripe
   * `current_period_end`) does not pull in the next day, but mid-day bounds over-count by the runs
   * of the first and last day that fall outside the range. Use `getOrganizationUsageInExactRange`
   * when the exact range matters.
   */
  async getPlatformUsageByWholeUtcDays(
    startDate: Date,
    endDate: Date,
    organizationId?: string
  ): Promise<Array<{ organization_id: string; count: string }>> {
    const organizationFilter = organizationId ? 'AND organization_id = {organizationId:String}' : '';
    const { start, end } = toInclusiveUtcDays(startDate, endDate);

    const query = `
      SELECT
        organization_id,
        sum(count) as count
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE
        date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type = 'workflow_run_status_processing'
        ${organizationFilter}
      GROUP BY organization_id
      ORDER BY organization_id
    `;

    const params: Record<string, unknown> = {
      startDate: start,
      endDate: end,
    };

    if (organizationId) {
      params.organizationId = organizationId;
    }

    const result = await this.clickhouseService.query<{
      organization_id: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  /**
   * Same source and whole-UTC-day semantics as `getPlatformUsageByWholeUtcDays`, but one row per
   * `(organization_id, date)` so callers can sum arbitrary per-org sub-ranges in memory.
   * `day` is the UTC calendar day as `YYYY-MM-DD`. Callers that need an exact mid-day range pass
   * an organization's rows to `getOrganizationUsageInExactRangeFromDailyUsage`.
   *
   * When `minimumOrganizationTotal` is set, only organizations whose `sum(count)` over that same
   * window is at least the minimum are returned.
   */
  async getPlatformDailyUsageByWholeUtcDays(
    startDate: Date,
    endDate: Date,
    minimumOrganizationTotal?: number
  ): Promise<Array<{ organization_id: string; day: string; count: string }>> {
    const { start, end } = toInclusiveUtcDays(startDate, endDate);
    const params: Record<string, unknown> = {
      startDate: start,
      endDate: end,
    };
    let organizationTotalFilter = '';

    if (minimumOrganizationTotal !== undefined) {
      organizationTotalFilter = `
        AND organization_id IN (
          SELECT organization_id
          FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
          WHERE
            date >= {startDate:Date}
            AND date <= {endDate:Date}
            AND event_type = 'workflow_run_status_processing'
          GROUP BY organization_id
          HAVING sum(count) >= {minimumOrganizationTotal:UInt64}
        )`;
      params.minimumOrganizationTotal = minimumOrganizationTotal;
    }

    const query = `
      SELECT
        organization_id,
        toString(date) as day,
        sum(count) as count
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE
        date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type = 'workflow_run_status_processing'
        ${organizationTotalFilter}
      GROUP BY organization_id, date
      ORDER BY organization_id, date
    `;

    const result = await this.clickhouseService.query<{
      organization_id: string;
      day: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  /**
   * Processing workflow runs of one organization within exactly `[startDate, endDate)`: the whole-UTC-day count
   * minus the runs on the first and last UTC day that fall outside the range.
   */
  async getOrganizationUsageInExactRange(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    const [wholeDayRows, edgeDayRunsOutside] = await Promise.all([
      this.getPlatformUsageByWholeUtcDays(startDate, endDate, organizationId),
      this.countEdgeDayRunsOutsideRange(organizationId, startDate, endDate),
    ]);
    const wholeDayCount = parseInt(wholeDayRows[0]?.count || '0', 10);

    return this.subtractEdgeDayRuns(organizationId, wholeDayCount, edgeDayRunsOutside);
  }

  /**
   * Same count as `getOrganizationUsageInExactRange`, with the whole UTC days summed from rows the caller already
   * read. Days after the end of that read are taken as empty. When the rows start after the range's first day,
   * the range is counted from ClickHouse instead.
   */
  async getOrganizationUsageInExactRangeFromDailyUsage({
    organizationId,
    dailyUsage,
    dailyUsageFrom,
    startDate,
    endDate,
  }: ExactRangeFromDailyUsageQuery): Promise<number> {
    const { start, end } = toInclusiveUtcDays(startDate, endDate);

    if (toUtcDay(dailyUsageFrom) > start) {
      this.logger.warn(
        { organizationId, dailyUsageFrom, startDate },
        'Daily workflow run usage starts after the first day of the range; counting the range from ClickHouse'
      );

      return this.getOrganizationUsageInExactRange(organizationId, startDate, endDate);
    }

    const wholeDayCount = dailyUsage
      .filter(({ day }) => day >= start && day <= end)
      .reduce((sum, { count }) => sum + count, 0);
    const edgeDayRunsOutside = await this.countEdgeDayRunsOutsideRange(organizationId, startDate, endDate);

    return this.subtractEdgeDayRuns(organizationId, wholeDayCount, edgeDayRunsOutside);
  }

  /**
   * Processing workflow runs of one organization on the first and last UTC day of `[startDate, endDate)` that fall
   * outside it: what a whole-day sum over the range over-counts by. Read from raw `traces`, since
   * `workflow_run_count` only has daily buckets.
   */
  private async countEdgeDayRunsOutsideRange(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    const { firstDayStart, lastDayEnd, isUtcDayAligned } = inclusiveUtcDayBounds(startDate, endDate);

    if (isUtcDayAligned) {
      return 0;
    }

    const query = `
      SELECT count() as count
      FROM ${TRACES_TABLE_NAME}
      WHERE
        organization_id = {organizationId:String}
        AND entity_type = 'workflow_run'
        AND event_type = 'workflow_run_status_processing'
        AND (
          (created_at >= {firstDayStart:DateTime64(3, 'UTC')} AND created_at < {startDate:DateTime64(3, 'UTC')})
          OR (created_at >= {endDate:DateTime64(3, 'UTC')} AND created_at < {lastDayEnd:DateTime64(3, 'UTC')})
        )
    `;

    const result = await this.clickhouseService.query<{ count: string }>({
      query,
      params: {
        organizationId,
        firstDayStart: LogRepository.formatDateTime64(firstDayStart),
        startDate: LogRepository.formatDateTime64(startDate),
        endDate: LogRepository.formatDateTime64(endDate),
        lastDayEnd: LogRepository.formatDateTime64(lastDayEnd),
      },
      settings: { log_comment: EDGE_DAY_CORRECTION_LOG_COMMENT },
    });

    return parseInt(result.data[0]?.count || '0', 10);
  }

  private subtractEdgeDayRuns(organizationId: string, wholeDayCount: number, edgeDayRunsOutside: number): number {
    if (edgeDayRunsOutside > wholeDayCount) {
      this.logger.warn(
        { organizationId, wholeDayCount, edgeDayRunsOutside },
        'Edge-day workflow runs outside the range exceed the whole-day count; the ClickHouse workflow_run_count and traces tables disagree'
      );
    }

    return Math.max(wholeDayCount - edgeDayRunsOutside, 0);
  }

  async getActiveOrganizationIds(
    startDate: Date,
    endDate: Date,
    minWorkflowRuns: number = 500,
    minSentMessages: number = 100
  ): Promise<string[]> {
    const query = `
      SELECT 
        organization_id,
        sumIf(count, event_type = 'workflow_run_status_processing') as total_workflow_runs,
        sumIf(count, event_type = 'workflow_run_delivery_sent') as total_sent_messages
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        date >= {startDate:Date}
        AND date <= {endDate:Date}
      GROUP BY organization_id
      HAVING total_workflow_runs >= {minWorkflowRuns:UInt32}
        AND total_sent_messages >= {minSentMessages:UInt32}
    `;

    const params: Record<string, unknown> = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      minWorkflowRuns,
      minSentMessages,
    };

    const result = await this.clickhouseService.query<{
      organization_id: string;
      total_workflow_runs: string;
      total_sent_messages: string;
    }>({
      query,
      params,
    });

    return result.data.map((row) => row.organization_id);
  }

  async getWorkflowVolumeData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 5
  ): Promise<Array<{ workflow_run_id: string; count: string }>> {
    const query = `
      SELECT 
        workflow_run_id,
        sum(count) as count
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String}
        AND organization_id = {organizationId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type = 'workflow_run_status_processing'
      GROUP BY workflow_run_id
      ORDER BY count DESC
      LIMIT {limit:UInt32}
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit,
    };

    const result = await this.clickhouseService.query<{
      workflow_run_id: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getTotalRunsCount(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const query = `
      SELECT sum(count) as total
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String}
        AND organization_id = {organizationId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type = 'workflow_run_status_processing'
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const result = await this.clickhouseService.query<{ total: string }>({
      query,
      params,
    });

    return parseInt(result.data[0]?.total || '0', 10);
  }

  async getWorkflowRunsTrendData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; event_type: string; count: string }>> {
    const query = `
      SELECT 
        date,
        event_type,
        sum(count) as count
      FROM ${WORKFLOW_RUN_COUNT_TABLE_NAME}
      WHERE 
        environment_id = {environmentId:String}
        AND organization_id = {organizationId:String}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
        AND event_type IN ('workflow_run_status_processing', 'workflow_run_status_completed', 'workflow_run_status_error')
      GROUP BY date, event_type
      ORDER BY date, event_type
    `;

    const params: Record<string, unknown> = {
      environmentId,
      organizationId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

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
}
