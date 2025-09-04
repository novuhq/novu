import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ClickhouseOperator,
  FieldCondition,
  PinoLogger,
  QueryBuilder,
  StepRun,
  StepRunRepository,
  Where,
  WorkflowRun,
  WorkflowRunRepository,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { SeverityLevelEnum } from '@novu/shared';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';
import { GetWorkflowRunsDto, GetWorkflowRunsResponseDto } from '../../dtos/workflow-runs-response.dto';
import { mapWorkflowRunStatusToDto } from '../../shared/mappers';
import { GetWorkflowRunsCommand } from './get-workflow-runs.command';

type CursorData = {
  created_at: string;
  workflow_run_id: string;
};

const workflowRunSelectColumns = [
  'workflow_run_id',
  'workflow_id',
  'workflow_name',
  'organization_id',
  'environment_id',
  'subscriber_id',
  'external_subscriber_id',
  'status',
  'trigger_identifier',
  'transaction_id',
  'created_at',
  'updated_at',
  'delivery_lifecycle_status',
  'severity',
  'critical',
] as const;
type WorkflowRunFetchResult = Pick<WorkflowRun, (typeof workflowRunSelectColumns)[number]>;

const stepRunSelectColumns = [
  'id',
  'step_run_id',
  'step_id',
  'workflow_run_id',
  'subscriber_id',
  'external_subscriber_id',
  'step_type',
  'step_name',
  'provider_id',
  'status',
  'transaction_id',
  'created_at',
  'updated_at',
] as const;
type StepRunFetchResult = Pick<StepRun, (typeof stepRunSelectColumns)[number]>;

const DEPLOYMENT_DATE = new Date('2025-09-04T00:00:00');

@Injectable()
export class GetWorkflowRuns {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private stepRunRepository: StepRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(GetWorkflowRuns.name);
  }

  async execute(command: GetWorkflowRunsCommand): Promise<GetWorkflowRunsResponseDto> {
    this.logger.debug('Getting workflow runs with compound cursor-based pagination', {
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      limit: command.limit,
      cursor: command.cursor ? 'present' : 'not-present',
    });

    try {
      const queryBuilder = new QueryBuilder<WorkflowRun>({
        environmentId: command.environmentId,
      });

      if (command.workflowIds?.length) {
        queryBuilder.whereIn('workflow_id', command.workflowIds);
      }

      if (command.subscriberIds?.length) {
        queryBuilder.whereIn('external_subscriber_id', command.subscriberIds);
      }

      if (command.transactionIds?.length) {
        queryBuilder.whereIn('transaction_id', command.transactionIds);
      }

      if (command.statuses?.length) {
        const statuses = command.statuses.map((status) => {
          //backward compatibility: if new statuses are used, append old status until renewed in the database, nv-6562
          if (status === WorkflowRunStatusDtoEnum.PROCESSING) {
            return [WorkflowRunStatusEnum.PENDING, WorkflowRunStatusEnum.PROCESSING];
          }
          if (status === WorkflowRunStatusDtoEnum.COMPLETED) {
            return [WorkflowRunStatusEnum.SUCCESS, WorkflowRunStatusEnum.COMPLETED];
          }
          if (status === WorkflowRunStatusDtoEnum.ERROR) {
            return [WorkflowRunStatusEnum.ERROR];
          }
          return status;
        });
        queryBuilder.whereIn('status', statuses.flat());
      }

      if (command.createdGte) {
        queryBuilder.whereGreaterThanOrEqual('created_at', new Date(command.createdGte));
      }

      if (command.createdLte) {
        queryBuilder.whereLessThanOrEqual('created_at', new Date(command.createdLte));
      }

      if (command.channels?.length) {
        queryBuilder.orWhere(
          command.channels.map((channel) => ({
            field: 'channels',
            operator: 'LIKE',
            value: `%"${channel}"%`,
          }))
        );
      }

      const severity = command.severity ?? [];
      if (severity.length) {
        const orConditions: Array<FieldCondition<WorkflowRun, keyof WorkflowRun, ClickhouseOperator>> = [];
        if (severity.includes(SeverityLevelEnum.NONE)) {
          orConditions.push({
            field: 'severity',
            operator: 'IS NULL',
          });
          orConditions.push({
            field: 'severity',
            operator: '=',
            value: SeverityLevelEnum.NONE,
          });
        }
        const severityWithoutNone = severity.filter((severity) => severity !== SeverityLevelEnum.NONE);
        for (const severity of severityWithoutNone) {
          orConditions.push({
            field: 'severity',
            operator: '=',
            value: severity.toString(),
          });
        }
        queryBuilder.orWhere(orConditions);

        // TODO: Remove this in a few weeks after deployment
        queryBuilder.whereGreaterThanOrEqual('created_at', DEPLOYMENT_DATE);
      }

      if (command.topicKey) {
        queryBuilder.whereLike('topics', `%${command.topicKey}%`);
      }

      const safeWhere = queryBuilder.build();

      let cursor: CursorData | undefined;
      if (command.cursor) {
        try {
          cursor = this.decodeCursor(command.cursor);
          this.logger.debug('Using compound cursor pagination', {
            timestamp: cursor.created_at,
            workflowRunId: cursor.workflow_run_id,
          });
        } catch (error) {
          throw new BadRequestException('Invalid cursor format');
        }
      }

      const result = (await this.workflowRunRepository.findWithCursor({
        where: safeWhere,
        cursor,
        limit: command.limit + 1, // Get one extra to determine if there are more results
        orderDirection: 'DESC',
        useFinal: true, // Use FINAL for consistent reads in ReplacingMergeTree
        select: workflowRunSelectColumns,
      })) satisfies { data: WorkflowRunFetchResult[] };

      const workflowRuns = result.data;
      const hasMore = workflowRuns.length > command.limit;

      // Remove the extra item if present
      if (hasMore) {
        workflowRuns.pop();
      }

      // Generate next cursor if there are more results
      let nextCursor: string | null = null;
      if (hasMore && workflowRuns.length > 0) {
        const lastRun = workflowRuns[workflowRuns.length - 1];
        nextCursor = this.encodeCursor({
          created_at: this.parseClickHouseTimestamp(lastRun.created_at).toISOString(),
          workflow_run_id: lastRun.workflow_run_id,
        });
      }

      // Generate previous cursor if we're not on the first page
      let previousCursor: string | null = null;
      if (command.cursor && workflowRuns.length > 0) {
        previousCursor = await this.generatePreviousCursor(safeWhere, cursor!, command.limit);
      }

      // Fetch step runs for all workflow runs efficiently
      const stepRunsByCompositeKey = await this.getStepRunsForWorkflowRuns(command, workflowRuns);

      const data = await Promise.all(
        workflowRuns.map((workflowRun) => {
          const compositeKey = `${workflowRun.subscriber_id}:${workflowRun.transaction_id}`;

          return this.mapWorkflowRunToDto(workflowRun, stepRunsByCompositeKey.get(compositeKey) || []);
        })
      );

      return {
        data,
        next: nextCursor,
        previous: previousCursor,
      };
    } catch (error) {
      this.logger.error('Failed to get workflow runs', {
        error: error.message,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });
      throw error;
    }
  }

  /**
   * Generates the previous cursor using a simple approach:
   * Query backwards from current cursor and use the last item as the boundary
   */
  private async generatePreviousCursor(
    safeWhere: Where<WorkflowRun>,
    currentCursor: CursorData,
    limit: number
  ): Promise<string | null> {
    const isBoundaryCase = currentCursor?.workflow_run_id === '1'; // first or last item
    // Return empty when at boundary during cursor computation - cannot compute previous page beyond dataset limits
    if (isBoundaryCase) {
      return null;
    }

    try {
      const backwardResult = await this.workflowRunRepository.findWithCursor({
        where: safeWhere,
        cursor: currentCursor,
        limit,
        orderDirection: 'ASC', // Get older items
        useFinal: true,
        select: ['created_at', 'workflow_run_id'],
      });

      const previousPageItems = backwardResult.data as WorkflowRun[];

      if (previousPageItems.length === 0) {
        return null;
      }

      if (previousPageItems.length < limit) {
        return this.encodeCursor({
          created_at: new Date(0).toISOString(), // Unix epoch (1970-01-01)
          workflow_run_id: '1', // Earliest possible workflow_run_id
        });
      }

      /*
       * Use the last item from the previous page as the cursor.
       * When this cursor is used with DESC order, it will exclude this item
       * and everything older, effectively giving us the previous page.
       */
      const lastItemOfPreviousPage = previousPageItems[previousPageItems.length - 1];

      return this.encodeCursor({
        created_at: this.parseClickHouseTimestamp(lastItemOfPreviousPage.created_at).toISOString(),
        workflow_run_id: lastItemOfPreviousPage.workflow_run_id,
      });
    } catch (error) {
      this.logger.error('Failed to generate previous cursor', {
        error: error.message,
        currentCursor,
      });

      return null;
    }
  }

  /**
   * Cursor-based pagination implementation for ClickHouse optimization
   * This approach provides consistent performance regardless of page depth
   */
  private encodeCursor(data: CursorData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private decodeCursor(cursor: string): CursorData {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  }

  /**
   * Parses ClickHouse timestamp format as UTC
   * ClickHouse returns timestamps in format "YYYY-MM-DD HH:mm:ss.SSS" which should be treated as UTC
   * but JavaScript's Date constructor interprets them as local time by default
   */
  private parseClickHouseTimestamp(timestamp: string | Date): Date {
    // If already a Date object, return as-is
    if (timestamp instanceof Date) {
      return timestamp;
    }

    /*
     * ClickHouse format: "2025-07-23 13:52:52.860"
     * Convert to ISO format with explicit UTC: "2025-07-23T13:52:52.860Z"
     */
    const isoFormat = `${timestamp.replace(' ', 'T')}Z`;

    return new Date(isoFormat);
  }

  /**
   * Efficiently fetch step runs for multiple workflow runs using batch query
   * Groups by composite key: subscriber_id:transaction_id
   */
  private async getStepRunsForWorkflowRuns(
    command: GetWorkflowRunsCommand,
    workflowRuns: WorkflowRunFetchResult[]
  ): Promise<Map<string, StepRunFetchResult[]>> {
    if (workflowRuns.length === 0) {
      return new Map();
    }

    try {
      const transactionIds = workflowRuns.map((run) => run.transaction_id);
      const stepRunsQuery = new QueryBuilder<StepRun>({
        environmentId: command.environmentId,
      })
        .whereIn('transaction_id', transactionIds)
        .build();

      const stepRunsResult = await this.stepRunRepository.find({
        where: stepRunsQuery,
        orderBy: 'created_at',
        orderDirection: 'ASC',
        useFinal: true,
        select: stepRunSelectColumns,
      });

      // Group step runs by composite key: subscriber_id:transaction_id
      const stepRunsByCompositeKey = new Map<string, StepRunFetchResult[]>();

      for (const stepRun of stepRunsResult.data) {
        const compositeKey = `${stepRun.subscriber_id}:${stepRun.transaction_id}`;
        if (!stepRunsByCompositeKey.has(compositeKey)) {
          stepRunsByCompositeKey.set(compositeKey, []);
        }
        // biome-ignore lint/style/noNonNullAssertion: <explanation> because we otherwise the if statement would set it to the map
        stepRunsByCompositeKey.get(compositeKey)!.push(stepRun);
      }

      return stepRunsByCompositeKey;
    } catch (error) {
      this.logger.warn('Failed to get step runs for workflow runs', {
        error: error.message,
        transactionIds: workflowRuns.map((run) => run.transaction_id),
        subscriberIds: workflowRuns.map((run) => run.subscriber_id),
      });

      return new Map();
    }
  }

  private async mapWorkflowRunToDto(
    workflowRun: WorkflowRunFetchResult,
    stepRuns: StepRunFetchResult[]
  ): Promise<GetWorkflowRunsDto> {
    return {
      id: workflowRun.workflow_run_id,
      workflowId: workflowRun.workflow_id,
      workflowName: workflowRun.workflow_name,
      organizationId: workflowRun.organization_id,
      environmentId: workflowRun.environment_id,
      internalSubscriberId: workflowRun.subscriber_id,
      subscriberId: workflowRun.external_subscriber_id || undefined,
      status: mapWorkflowRunStatusToDto(workflowRun.status),
      deliveryLifecycleStatus: workflowRun.delivery_lifecycle_status,
      triggerIdentifier: workflowRun.trigger_identifier,
      transactionId: workflowRun.transaction_id,
      createdAt: new Date(`${workflowRun.created_at} UTC`).toISOString(),
      updatedAt: new Date(`${workflowRun.updated_at} UTC`).toISOString(),
      steps: stepRuns.map((stepRun) => ({
        id: stepRun.id,
        stepRunId: stepRun.step_run_id,
        stepType: stepRun.step_type,
        status: stepRun.status,
      })),
      severity: workflowRun.severity,
      critical: workflowRun.critical,
    };
  }
}
