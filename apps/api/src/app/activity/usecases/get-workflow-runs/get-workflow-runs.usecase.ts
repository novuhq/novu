import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkflowRunRepository, WorkflowRun, PinoLogger, Where } from '@novu/application-generic';
import { GetWorkflowRunsResponseDto, WorkflowRunDto } from '../../dtos/workflow-runs-response.dto';
import { GetWorkflowRunsCommand } from './get-workflow-runs.command';

type CursorData = {
  created_at: string;
  workflow_run_id: string;
};

@Injectable()
export class GetWorkflowRuns {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
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
      const whereConditions: Where<WorkflowRun> = {
        organization_id: command.organizationId,
        environment_id: command.environmentId,
      };

      // Add optional filters similar to legacy notifications endpoint
      if (command.workflowIds?.length) {
        whereConditions.workflow_id = {
          operator: 'IN',
          value: command.workflowIds,
        };
      }

      if (command.subscriberIds?.length) {
        whereConditions.subscriber_id = {
          operator: 'IN',
          value: command.subscriberIds,
        };
      }

      if (command.transactionIds?.length) {
        whereConditions.transaction_id = {
          operator: 'IN',
          value: command.transactionIds,
        };
      }

      if (command.statuses?.length) {
        whereConditions.status = {
          operator: 'IN',
          value: command.statuses,
        };
      }

      /*
       * Handle date range conditions properly to avoid overwriting
       * Since the current query builder doesn't support multiple conditions on the same field,
       * we'll use separate field names that will be handled specially in the repository call
       */
      if (command.createdGte) {
        (whereConditions as any).created_at_gte = {
          operator: '>=',
          value: new Date(command.createdGte),
        };
      }

      if (command.createdLte) {
        (whereConditions as any).created_at_lte = {
          operator: '<=',
          value: new Date(command.createdLte),
        };
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

      /*
       * Execute query using WorkflowRunRepository's compound cursor method
       * This handles timestamp collisions properly using both created_at AND workflow_run_id
       * Order by created_at DESC, workflow_run_id DESC for most recent first
       */
      const result = await this.workflowRunRepository.findWithCursor({
        where: whereConditions,
        cursor,
        limit: command.limit + 1, // Get one extra to determine if there are more results
        orderDirection: 'DESC',
        useFinal: true, // Use FINAL for consistent reads in ReplacingMergeTree
      });

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

      const data = workflowRuns.map((workflowRun) => this.mapWorkflowRunToDto(workflowRun));

      return {
        data,
        nextCursor,
        previousCursor,
        hasMore,
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
      });

      const previousPageItems = backwardResult.data;

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

  private mapWorkflowRunToDto(workflowRun: WorkflowRun): WorkflowRunDto {
    return {
      id: workflowRun.id,
      workflowRunId: workflowRun.workflow_run_id,
      workflowId: workflowRun.workflow_id,
      workflowName: workflowRun.workflow_name,
      organizationId: workflowRun.organization_id,
      environmentId: workflowRun.environment_id,
      subscriberId: workflowRun.subscriber_id,
      externalSubscriberId: workflowRun.external_subscriber_id || undefined,
      status: workflowRun.status,
      triggerIdentifier: workflowRun.trigger_identifier,
      transactionId: workflowRun.transaction_id,
      channels: workflowRun.channels ? JSON.parse(workflowRun.channels) : [],
      subscriberTo: workflowRun.subscriber_to ? JSON.parse(workflowRun.subscriber_to) : undefined,
      payload: workflowRun.payload ? JSON.parse(workflowRun.payload) : undefined,
      controlValues: workflowRun.control_values ? JSON.parse(workflowRun.control_values) : undefined,
      topics: workflowRun.topics ? JSON.parse(workflowRun.topics) : undefined,
      isDigest: workflowRun.is_digest === 'true',
      digestedWorkflowRunId: workflowRun.digested_workflow_run_id || undefined,
      createdAt: new Date(workflowRun.created_at),
      updatedAt: new Date(workflowRun.updated_at),
    };
  }
}
