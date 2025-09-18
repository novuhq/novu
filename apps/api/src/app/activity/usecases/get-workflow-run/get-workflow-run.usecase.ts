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
import { JobEntity, JobRepository } from '@novu/dal';
import { SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { GetWorkflowRunResponseDto, StepRunDto } from '../../dtos/workflow-run-response.dto';
import { mapTraceToExecutionDetailDto, mapWorkflowRunStatusToDto } from '../../shared/mappers';
import { GetWorkflowRunCommand } from './get-workflow-run.command';

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
  'channels',
  'subscriber_to',
  'payload',
  'control_values',
  'topics',
  'is_digest',
  'digested_workflow_run_id',
  'created_at',
  'updated_at',
  'delivery_lifecycle_status',
  'severity',
  'critical',
] as const;
type WorkflowRunFetchResult = Pick<WorkflowRun, (typeof workflowRunSelectColumns)[number]>;

const stepRunSelectColumns = [
  'step_run_id',
  'step_id',
  'workflow_run_id',
  'subscriber_id',
  'external_subscriber_id',
  'message_id',
  'step_type',
  'step_name',
  'provider_id',
  'status',
  'error_code',
  'error_message',
  'transaction_id',
  'created_at',
  'updated_at',
  'digest',
  'schedule_extensions_count',
] as const;
type StepRunFetchResult = Pick<StepRun, (typeof stepRunSelectColumns)[number]>;

const traceSelectColumns = ['entity_id', 'id', 'status', 'title', 'raw_data', 'created_at'] as const;
type TraceFetchResult = Pick<Trace, (typeof traceSelectColumns)[number]>;

interface IStepRunWithDetails extends StepRunFetchResult {
  executionDetails?: TraceFetchResult[];
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

  /**
   * BACKWARD COMPATIBILITY: This method fetches digest data from Job entities at runtime
   * for step runs that don't have digest data stored in ClickHouse.
   * TODO: Remove this method as part of task nv-6576 once all step runs have digest data stored
   */
  private async getJobDigestDataByTransactionId(
    transactionId: string,
    command: GetWorkflowRunCommand
  ): Promise<Map<string, string | null>> {
    try {
      const jobs: Pick<JobEntity, '_id' | 'step' | 'digest'>[] = await this.jobRepository.find(
        {
          transactionId,
          _environmentId: command.environmentId,
        },
        '_id step digest'
      );

      const digestDataByStepId = new Map<string, string | null>();

      for (const job of jobs) {
        if (job.digest && job.step?.stepId) {
          digestDataByStepId.set(job._id, JSON.stringify(job.digest));
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
        select: workflowRunSelectColumns,
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
    workflowRun: WorkflowRunFetchResult
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
        select: stepRunSelectColumns,
      });

      if (!stepRunsResult.data || stepRunsResult.data.length === 0) {
        return [];
      }

      const stepRunIds = stepRunsResult.data.map((stepRun) => stepRun.step_run_id);
      const executionDetailsByStepRunId = await this.getExecutionDetailsByEntityId(stepRunIds, command);

      // BACKWARD COMPATIBILITY: Check if any step runs are missing digest data
      // TODO: Remove this logic as part of task nv-6576 once all step runs have digest data stored
      const stepRunsWithoutDigest = stepRunsResult.data.filter(
        (stepRun) => !stepRun.digest && stepRun.step_type === StepTypeEnum.DIGEST
      );
      const digestDataByStepId =
        stepRunsWithoutDigest.length > 0
          ? await this.getJobDigestDataByTransactionId(workflowRun.transaction_id, command)
          : new Map<string, string | null>();

      return stepRunsResult.data.map(
        (stepRun) =>
          ({
            ...stepRun,
            executionDetails: executionDetailsByStepRunId.get(stepRun.step_run_id) || [],
            digest: stepRun.digest ? stepRun.digest : digestDataByStepId.get(stepRun.step_run_id) || null,
          }) satisfies IStepRunWithDetails
      );
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
  ): Promise<Map<string, TraceFetchResult[]>> {
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
        select: traceSelectColumns,
      });

      const executionDetailsByEntityId = new Map<string, TraceFetchResult[]>();

      for (const trace of traceResult.data) {
        if (!executionDetailsByEntityId.has(trace.entity_id)) {
          executionDetailsByEntityId.set(trace.entity_id, []);
        }

        const existingTraces = executionDetailsByEntityId.get(trace.entity_id);
        if (existingTraces) {
          existingTraces.push(trace);
        }
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

  private mapStepRunToDto(stepRun: IStepRunWithDetails): StepRunDto {
    return {
      stepRunId: stepRun.step_run_id,
      stepId: stepRun.step_id,
      stepType: stepRun.step_type,
      providerId: stepRun.provider_id || undefined,
      status: stepRun.status,
      createdAt: new Date(stepRun.created_at),
      updatedAt: new Date(stepRun.updated_at),
      digest: stepRun.digest ? JSON.parse(stepRun.digest) : undefined,
      executionDetails: mapTraceToExecutionDetailDto(stepRun.executionDetails || []),
      scheduleExtensionsCount: stepRun.schedule_extensions_count,
    };
  }

  private mapWorkflowRunToDto(
    workflowRun: WorkflowRunFetchResult,
    stepRuns: IStepRunWithDetails[]
  ): GetWorkflowRunResponseDto {
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
      payload: workflowRun.payload ? JSON.parse(workflowRun.payload) : {},
      steps: stepRuns.map((stepRun) => this.mapStepRunToDto(stepRun)),
      severity: workflowRun.severity,
      critical: workflowRun.critical,
    };
  }
}
