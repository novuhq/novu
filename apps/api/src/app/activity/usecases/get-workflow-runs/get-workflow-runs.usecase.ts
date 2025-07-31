import { Injectable, BadRequestException } from '@nestjs/common';
import {
  WorkflowRunRepository,
  WorkflowRun,
  PinoLogger,
  Where,
  StepRunRepository,
  StepRun,
} from '@novu/application-generic';
import { GetWorkflowRunsResponseDto, GetWorkflowRunsDto } from '../../dtos/workflow-runs-response.dto';
import { GetWorkflowRunsCommand } from './get-workflow-runs.command';
import { mapWorkflowRunStatusToDto } from '../../shared/mappers';

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
] as const;
type WorkflowRunFetchResult = Pick<WorkflowRun, (typeof workflowRunSelectColumns)[number]>;

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
      // Build WHERE conditions object for LogRepository
      const whereConditions: Where<WorkflowRun> = [
        { organization_id: { operator: '=', value: command.organizationId } },
        { environment_id: { operator: '=', value: command.environmentId } },
      ];

      // Add optional filters similar to legacy notifications endpoint
      if (command.workflowIds?.length) {
        whereConditions.push({
          workflow_id: {
            operator: 'IN',
            value: command.workflowIds,
          },
        });
      }

      if (command.subscriberIds?.length) {
        whereConditions.push({
          subscriber_id: {
            operator: 'IN',
            value: command.subscriberIds,
          },
        });
      }

      if (command.transactionIds?.length) {
        whereConditions.push({
          transaction_id: {
            operator: 'IN',
            value: command.transactionIds,
          },
        });
      }

      if (command.statuses?.length) {
        whereConditions.push({
          status: {
            operator: 'IN',
            value: command.statuses,
          },
        });
      }

      /*
       * Handle date range conditions properly to avoid overwriting
       * Since the current query builder doesn't support multiple conditions on the same field,
       * we'll use separate field names that will be handled specially in the repository call
       */
      if (command.createdGte) {
        whereConditions.push({
          created_at: {
            operator: '>=',
            value: new Date(command.createdGte),
          },
        });
      }

      if (command.createdLte) {
        whereConditions.push({
          created_at: {
            operator: '<=',
            value: new Date(command.createdLte),
          },
        });
      }

      // Decode cursor if provided
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
        where: whereConditions,
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
        previousCursor = await this.generatePreviousCursor(whereConditions, cursor!, command.limit);
      }

      // Fetch step runs for all workflow runs efficiently
      const stepRunsByCompositeKey = await this.getStepRunsForWorkflowRuns(command, workflowRuns);

      const data = workflowRuns.map((workflowRun) => {
        const compositeKey = `${workflowRun.subscriber_id}:${workflowRun.transaction_id}`;

        return this.mapWorkflowRunToDto(workflowRun, stepRunsByCompositeKey.get(compositeKey) || []);
      });

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
    whereConditions: Where<WorkflowRun>,
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
        where: whereConditions,
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
  ): Promise<Map<string, StepRun[]>> {
    if (workflowRuns.length === 0) {
      return new Map();
    }

    try {
      const transactionIds = workflowRuns.map((run) => run.transaction_id);

      const stepRunsResult = await this.stepRunRepository.find({
        where: [
          { organization_id: { operator: '=', value: command.organizationId } },
          { environment_id: { operator: '=', value: command.environmentId } },
          { transaction_id: { operator: 'IN', value: transactionIds } },
        ],
        orderBy: 'created_at',
        orderDirection: 'ASC',
        useFinal: true,
      });

      // Group step runs by composite key: subscriber_id:transaction_id
      const stepRunsByCompositeKey = new Map<string, StepRun[]>();

      for (const stepRun of stepRunsResult.data) {
        const compositeKey = `${stepRun.subscriber_id}:${stepRun.transaction_id}`;
        if (!stepRunsByCompositeKey.has(compositeKey)) {
          stepRunsByCompositeKey.set(compositeKey, []);
        }
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

  private mapWorkflowRunToDto(workflowRun: WorkflowRunFetchResult, stepRuns: StepRun[]): GetWorkflowRunsDto {
    return {
      id: workflowRun.workflow_run_id,
      workflowId: workflowRun.workflow_id,
      workflowName: workflowRun.workflow_name,
      organizationId: workflowRun.organization_id,
      environmentId: workflowRun.environment_id,
      internalSubscriberId: workflowRun.subscriber_id,
      subscriberId: workflowRun.external_subscriber_id || undefined,
      status: mapWorkflowRunStatusToDto(workflowRun.status, stepRuns),
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
    };
  }
}
