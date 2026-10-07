import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { toInclusiveUtcDays } from '../inclusive-utc-days';
import { LogRepository } from '../log.repository';
import { TABLE_NAME as TRACES_TABLE_NAME } from '../trace-log/trace-log.schema';
import {
  WORKFLOW_RUN_COUNT_ORDER_BY,
  WORKFLOW_RUN_COUNT_TABLE_NAME,
  WorkflowRunCount,
  workflowRunCountSchema,
} from './workflow-run-count.schema';

const DAY_MS = 24 * 60 * 60 * 1000;

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
   * Platform usage from `workflow_run_count`, filtered to
   * `event_type = workflow_run_status_processing`.
   *
   * Callers pass a half-open Date range `[startDate, endDate)`. That maps to
   * inclusive UTC calendar days: `date >= toDate(start) AND date <= toDate(end - 1ms)`,
   * so a midnight exclusive period end (e.g. Stripe `current_period_end`) does not
   * pull in the next period's first day.
   */
  async getPlatformUsageByDateRange(
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
   * Exact processing-run count of one organization in the half-open range `[startDate, endDate)`, unlike the
   * whole-UTC-day `getPlatformUsageByDateRange`, which it corrects by `getEdgeDayUsageOutsideRange`.
   */
  async getOrganizationUsageByDateRange(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    const [wholeDayRows, edgeDayUsageOutsideRange] = await Promise.all([
      this.getPlatformUsageByDateRange(startDate, endDate, organizationId),
      this.getEdgeDayUsageOutsideRange(organizationId, startDate, endDate),
    ]);
    const wholeDayUsage = wholeDayRows.length > 0 ? parseInt(wholeDayRows[0].count, 10) : 0;

    return Math.max(wholeDayUsage - edgeDayUsageOutsideRange, 0);
  }

  /**
   * Processing runs of one organization on the first and last UTC day of `[startDate, endDate)` that fall outside
   * it: what a whole-day `workflow_run_count` sum over `toInclusiveUtcDays(startDate, endDate)` over-counts by.
   * Read from `traces`, which keeps the exact `created_at`. Both slices lie before `startDate` or from `endDate` on,
   * so the result does not grow while the range is still being filled.
   */
  async getEdgeDayUsageOutsideRange(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    const startDayStart = startOfUtcDay(startDate);
    const endDayEnd = new Date(startOfUtcDay(new Date(endDate.getTime() - 1)).getTime() + DAY_MS);

    if (startDayStart.getTime() === startDate.getTime() && endDayEnd.getTime() === endDate.getTime()) {
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
          (created_at >= {startDayStart:DateTime64(3)} AND created_at < {startDate:DateTime64(3)})
          OR (created_at >= {endDate:DateTime64(3)} AND created_at < {endDayEnd:DateTime64(3)})
        )
    `;

    const result = await this.clickhouseService.query<{ count: string }>({
      query,
      params: {
        organizationId,
        startDayStart: LogRepository.formatDateTime64(startDayStart),
        startDate: LogRepository.formatDateTime64(startDate),
        endDate: LogRepository.formatDateTime64(endDate),
        endDayEnd: LogRepository.formatDateTime64(endDayEnd),
      },
    });

    return parseInt(result.data[0]?.count || '0', 10);
  }

  /**
   * Same source and half-open range semantics as `getPlatformUsageByDateRange`, but one row per
   * `(organization_id, date)` so callers can sum arbitrary per-org sub-ranges in memory.
   * `day` is the UTC calendar day as `YYYY-MM-DD`.
   *
   * When `minimumOrganizationTotal` is set, only organizations whose `sum(count)` over that same
   * window is at least the minimum are returned.
   */
  async getPlatformDailyUsageByDateRange(
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

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
