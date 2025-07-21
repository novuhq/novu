import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkflowRunRepository, WorkflowRun, PinoLogger } from '@novu/application-generic';
import { GetWorkflowRunsResponseDto, WorkflowRunDto } from '../../dtos/workflow-runs-response.dto';
import { GetWorkflowRunsCommand } from './get-workflow-runs.command';

interface ICursorData {
  created_at: string;
  workflow_run_id: string;
}

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
      const whereConditions: any = {
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

      if (command.createdGte) {
        whereConditions.created_at = {
          operator: '>=',
          value: new Date(command.createdGte),
        };
      }

      if (command.createdLte) {
        const beforeCondition = {
          operator: '<=',
          value: new Date(command.createdLte),
        };
        whereConditions.created_at = beforeCondition;
      }

      // Decode cursor if provided
      let cursor: { created_at: string; workflow_run_id: string } | undefined;
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
      let nextCursor: string | undefined;
      if (hasMore && workflowRuns.length > 0) {
        const lastRun = workflowRuns[workflowRuns.length - 1];
        nextCursor = this.encodeCursor({
          created_at: new Date(lastRun.created_at).toISOString(),
          workflow_run_id: lastRun.workflow_run_id,
        });
      }

      // Generate previous cursor if we're not on the first page
      let previousCursor: string | undefined;
      if (command.cursor && workflowRuns.length > 0) {
        const firstRun = workflowRuns[0];
        previousCursor = this.encodeCursor({
          created_at: new Date(firstRun.created_at).toISOString(),
          workflow_run_id: firstRun.workflow_run_id,
        });
      }

      const data = workflowRuns.map((workflowRun) => this.mapWorkflowRunToDto(workflowRun));

      return {
        data,
        nextCursor,
        previousCursor,
        hasMore,
        pageSize: data.length,
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
   * Cursor-based pagination implementation for ClickHouse optimization
   * This approach provides consistent performance regardless of page depth
   */
  private encodeCursor(data: ICursorData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private decodeCursor(cursor: string): ICursorData {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  }

  private mapWorkflowRunToDto(workflowRun: WorkflowRun): WorkflowRunDto {
    return {
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
      createdAt: new Date(workflowRun.created_at).toISOString(),
      updatedAt: new Date(workflowRun.updated_at).toISOString(),
    };
  }
}
