import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PinoLogger,
  QueryBuilder,
  StepRun,
  StepRunRepository,
  Trace,
  TraceLogRepository,
  WorkflowRun,
  WorkflowRunRepository,
} from '@novu/application-generic';
import { JobRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { mapDigest } from '../../../notifications/usecases/get-activity-feed/map-feed-item-to.dto';
import { GetWorkflowRunResponseDto } from '../../dtos/workflow-run-response.dto';
import { mapWorkflowRunStatusToDto } from '../../shared/mappers';
import { GetWorkflowRunCommand } from './get-workflow-run.command';

interface IStepRunWithDetails extends StepRun {
  executionDetails?: any[];
  digest?: any;
}

@Injectable()
export class GetWorkflowRun {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private stepRunRepository: StepRunRepository,
    private traceLogRepository: TraceLogRepository,
    private jobRepository: JobRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetWorkflowRunCommand): Promise<GetWorkflowRunResponseDto> {
    this.logger.debug('Getting workflow run from ClickHouse', {
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      workflowRunId: command.workflowRunId,
    });

    try {
      const workflowRunQuery = new QueryBuilder<WorkflowRun>({
        environmentId: command.environmentId,
      })
        .whereEquals('workflow_run_id', command.workflowRunId)
        .build();

      const workflowRunResult = await this.workflowRunRepository.findOne({
        where: workflowRunQuery,
        useFinal: true,
      });

      if (!workflowRunResult.data) {
        throw new NotFoundException('Workflow run not found', {
          cause: `Workflow run with id ${command.workflowRunId} not found`,
        });
      }

      const workflowRun = workflowRunResult.data;
      const stepRuns = await this.getStepRunsForWorkflowRun(command, workflowRun);
      const workflowRunDto = this.mapWorkflowRunToDto(workflowRun, stepRuns);

      return workflowRunDto;
    } catch (error) {
      this.logger.error('Failed to get workflow run', {
        error: error.message,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        workflowRunId: command.workflowRunId,
      });
      throw error;
    }
  }

  private async getStepRunsForWorkflowRun(
    command: GetWorkflowRunCommand,
    workflowRun: WorkflowRun
  ): Promise<IStepRunWithDetails[]> {
    try {
      const stepRunsQuery = new QueryBuilder<StepRun>({
        environmentId: command.environmentId,
      })
        .whereEquals('transaction_id', workflowRun.transaction_id)
        .whereEquals('workflow_run_id', workflowRun.workflow_run_id)
        .build();

      const stepRunsResult = await this.stepRunRepository.find({
        where: stepRunsQuery,
        orderBy: 'created_at',
        orderDirection: 'ASC',
        useFinal: true,
      });

      if (!stepRunsResult.data || stepRunsResult.data.length === 0) {
        return [];
      }

      const stepRunIds = stepRunsResult.data.map((stepRun) => stepRun.step_run_id);
      const executionDetailsByStepRunId = await this.getExecutionDetailsByEntityId(stepRunIds, command);
      const digestDataByStepId = await this.getJobDigestDataByTransactionId(workflowRun.transaction_id, command);

      return stepRunsResult.data.map((stepRun) => ({
        ...stepRun,
        executionDetails: executionDetailsByStepRunId.get(stepRun.step_run_id) || [],
        digest: digestDataByStepId.get(stepRun.step_run_id),
      }));
    } catch (error) {
      this.logger.warn('Failed to get step runs for workflow run', {
        error: error.message,
        workflowRunId: command.workflowRunId,
        transactionId: workflowRun.transaction_id,
      });

      return [];
    }
  }

  private async getExecutionDetailsByEntityId(
    entityIds: string[],
    command: GetWorkflowRunCommand
  ): Promise<Map<string, any[]>> {
    if (entityIds.length === 0) {
      return new Map();
    }

    try {
      const traceQuery = new QueryBuilder<Trace>({
        environmentId: command.environmentId,
      })
        .whereIn('entity_id', entityIds)
        .whereEquals('entity_type', 'step_run')
        .build();

      const traceResult = await this.traceLogRepository.find({
        where: traceQuery,
        orderBy: 'created_at',
        orderDirection: 'ASC',
      });

      const executionDetailsByEntityId = new Map<string, any[]>();

      for (const trace of traceResult.data) {
        if (!executionDetailsByEntityId.has(trace.entity_id)) {
          executionDetailsByEntityId.set(trace.entity_id, []);
        }

        executionDetailsByEntityId.get(trace.entity_id)!.push({
          _id: trace.id,
          detail: trace.title,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: this.mapTraceStatusToExecutionStatus(trace.status),
          isTest: false,
          isRetry: false,
          createdAt: this.parseClickHouseTimestamp(trace.created_at).toISOString(),
          raw: trace.raw_data,
        });
      }

      return executionDetailsByEntityId;
    } catch (error) {
      this.logger.warn('Failed to get execution details from traces', {
        error: error.message,
        entityIds,
      });

      return new Map();
    }
  }

  private async getJobDigestDataByTransactionId(
    transactionId: string,
    command: GetWorkflowRunCommand
  ): Promise<Map<string, any>> {
    try {
      const jobs = await this.jobRepository.find({
        transactionId,
        _environmentId: command.environmentId,
      });

      const digestDataByStepId = new Map<string, any>();

      for (const job of jobs) {
        if (job.digest && job.step?.stepId) {
          digestDataByStepId.set(job._id, job.digest);
        }
      }

      return digestDataByStepId;
    } catch (error) {
      this.logger.warn('Failed to get job digest data', {
        error: error.message,
        transactionId,
      });

      return new Map();
    }
  }

  private mapTraceStatusToExecutionStatus(traceStatus: string): ExecutionDetailsStatusEnum {
    switch (traceStatus.toLowerCase()) {
      case 'success':
        return ExecutionDetailsStatusEnum.SUCCESS;
      case 'error':
      case 'failed':
        return ExecutionDetailsStatusEnum.FAILED;
      case 'warning':
        return ExecutionDetailsStatusEnum.WARNING;
      case 'pending':
        return ExecutionDetailsStatusEnum.PENDING;
      case 'queued':
        return ExecutionDetailsStatusEnum.QUEUED;
      default:
        return ExecutionDetailsStatusEnum.PENDING;
    }
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

  private mapWorkflowRunToDto(workflowRun: WorkflowRun, stepRuns: IStepRunWithDetails[]): GetWorkflowRunResponseDto {
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
      payload: workflowRun.payload ? JSON.parse(workflowRun.payload) : {},
      steps: stepRuns.map((stepRun) => ({
        stepRunId: stepRun.step_run_id,
        stepId: stepRun.step_id,
        stepType: stepRun.step_type,
        providerId: stepRun.provider_id || undefined,
        status: stepRun.status,
        createdAt: new Date(stepRun.created_at),
        updatedAt: new Date(stepRun.updated_at),
        executionDetails: stepRun.executionDetails || [],
        digest: mapDigest(stepRun.digest),
      })),
    };
  }
}
