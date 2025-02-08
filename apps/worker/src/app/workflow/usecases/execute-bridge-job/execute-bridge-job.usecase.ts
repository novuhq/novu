import { Injectable } from '@nestjs/common';

import {
  ControlValuesRepository,
  NotificationTemplateEntity,
  EnvironmentRepository,
  JobRepository,
  NotificationTemplateRepository,
  MessageRepository,
  JobEntity,
} from '@novu/dal';
import {
  ControlValuesLevelEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  ITriggerPayload,
  JobStatusEnum,
  WorkflowOriginEnum,
  WorkflowTypeEnum,
} from '@novu/shared';
import { Event, State, PostActionEnum, ExecuteOutput } from '@novu/framework/internal';

import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  dashboardSanitizeControlValues,
  DetailEnum,
  ExecuteBridgeRequest,
  ExecuteBridgeRequestCommand,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
} from '@novu/application-generic';
import { ExecuteBridgeJobCommand } from './execute-bridge-job.command';

const LOG_CONTEXT = 'ExecuteBridgeJob';

@Injectable()
export class ExecuteBridgeJob {
  constructor(
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageRepository: MessageRepository,
    private environmentRepository: EnvironmentRepository,
    private controlValuesRepository: ControlValuesRepository,
    private createExecutionDetails: CreateExecutionDetails,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private logger: PinoLogger
  ) {}

  @InstrumentUsecase()
  async execute(command: ExecuteBridgeJobCommand): Promise<ExecuteOutput | null> {
    const stepId = command.job.step.stepId || command.job.step.uuid;

    const isStateful = !command.job.step.bridgeUrl;

    let workflow: NotificationTemplateEntity | null = null;
    if (isStateful) {
      workflow = await this.notificationTemplateRepository.findOne(
        {
          _id: command.job._templateId,
          _environmentId: command.environmentId,
          type: {
            $in: [WorkflowTypeEnum.ECHO, WorkflowTypeEnum.BRIDGE],
          },
        },
        '_id triggers type origin'
      );
    }

    if (!workflow && isStateful) {
      return null;
    }

    if (!stepId) {
      throw new Error('Step id is not set');
    }

    const environment = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
        _organizationId: command.organizationId,
      },
      'echo apiKeys _id'
    );

    if (!environment) {
      throw new Error(`Environment id ${command.environmentId} is not found`);
    }

    if (!environment?.echo?.url && isStateful && workflow?.origin === WorkflowOriginEnum.EXTERNAL) {
      throw new Error(`Bridge URL is not set for environment id: ${environment._id}`);
    }

    const { subscriber, payload: originalPayload } = command.variables || {};
    const payload = this.normalizePayload(originalPayload);

    const state = await this.generateState(command);

    const variablesStores = isStateful
      ? await this.findControlValues(command, workflow as NotificationTemplateEntity)
      : command.job.step.controlVariables;

    const bridgeEvent: Omit<Event, 'workflowId' | 'stepId' | 'action'> = {
      payload: payload ?? {},
      controls: variablesStores ?? {},
      state,
      subscriber: subscriber ?? {},
    };

    const workflowId = isStateful
      ? (workflow as NotificationTemplateEntity).triggers[0].identifier
      : command.identifier;

    const bridgeResponse = await this.sendBridgeRequest({
      environmentId: command.environmentId,
      /*
       * TODO: We fallback to external due to lack of backfilling origin for existing Workflows.
       * Once we backfill the origin field for existing Workflows, we should remove the fallback.
       */
      workflowOrigin: workflow?.origin || WorkflowOriginEnum.EXTERNAL,
      statelessBridgeUrl: command.job.step.bridgeUrl,
      event: bridgeEvent,
      job: command.job,
      searchParams: {
        workflowId,
        stepId,
      },
    });

    const createExecutionDetailsCommand: CreateExecutionDetailsCommand = {
      ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
      detail: DetailEnum.SUCCESSFUL_BRIDGE_RESPONSE_RECEIVED,
      source: ExecutionDetailsSourceEnum.INTERNAL,
      status: ExecutionDetailsStatusEnum.PENDING,
      isTest: false,
      isRetry: false,
      raw: JSON.stringify(bridgeResponse.metadata),
    };

    await this.createExecutionDetails.execute(createExecutionDetailsCommand);

    return bridgeResponse;
  }

  private async findControlValues(command: ExecuteBridgeJobCommand, workflow: NotificationTemplateEntity) {
    const controls = await this.controlValuesRepository.findOne({
      _organizationId: command.organizationId,
      _workflowId: workflow._id,
      _stepId: command.job.step._id,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    if (workflow?.origin === WorkflowOriginEnum.NOVU_CLOUD) {
      return controls?.controls
        ? dashboardSanitizeControlValues(this.logger, controls.controls, command.job?.step?.template?.type)
        : {};
    }

    return controls?.controls;
  }

  private normalizePayload(originalPayload: ITriggerPayload = {}) {
    // Remove internal params
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { __source, ...payload } = originalPayload;

    return payload;
  }

  private async generateState(command: ExecuteBridgeJobCommand): Promise<State[]> {
    const previousJobs: State[] = [];
    let theJob = (await this.jobRepository.findOne({
      _id: command.job._parentId,
      _environmentId: command.environmentId,
    })) as JobEntity;

    if (theJob) {
      const jobState = await this.mapState(theJob);
      previousJobs.push(jobState);
    }

    while (theJob) {
      theJob = (await this.jobRepository.findOne({
        _id: theJob._parentId,
        _environmentId: command.environmentId,
      })) as JobEntity;

      if (theJob) {
        const jobState = await this.mapState(theJob);
        previousJobs.push(jobState);
      }
    }

    return previousJobs;
  }

  @Instrument()
  private async sendBridgeRequest({
    statelessBridgeUrl,
    event,
    job,
    searchParams,
    workflowOrigin,
    environmentId,
  }: Omit<ExecuteBridgeRequestCommand, 'processError' | 'action' | 'retriesLimit'> & {
    job: JobEntity;
  }): Promise<ExecuteOutput> {
    return this.executeBridgeRequest.execute({
      statelessBridgeUrl,
      event,
      action: PostActionEnum.EXECUTE,
      searchParams,
      processError: async (response) => {
        const createExecutionDetailsCommand: CreateExecutionDetailsCommand = {
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.FAILED_BRIDGE_EXECUTION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            url: response.url,
            statusCode: response.statusCode,
            message: response.message,
            code: response.code,
            data: response.data,
          }),
        };

        await this.createExecutionDetails.execute(createExecutionDetailsCommand);
      },
      workflowOrigin,
      environmentId,
    }) as Promise<ExecuteOutput>;
  }

  @Instrument()
  private async mapState(job: JobEntity) {
    let output = {};

    switch (job.type) {
      case 'delay': {
        output = {
          duration: Date.now() - new Date(job.createdAt).getTime(),
        };
        break;
      }
      case 'digest': {
        const digestJobs = await this.jobRepository.find(
          {
            _mergedDigestId: job._id,
            type: 'digest',
            status: JobStatusEnum.MERGED,
            _environmentId: job._environmentId,
          },
          {
            payload: 1,
            createdAt: 1,
            _id: 1,
            transactionId: 1,
          }
        );
        output = {
          events: [...digestJobs, job]
            .map((digestJob) => ({
              id: digestJob._id,
              time: digestJob.createdAt,
              payload: digestJob.payload ?? {},
            }))
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
        };
        break;
      }
      case 'custom': {
        output = job.stepOutput || {};
        break;
      }
      case 'in_app': {
        const message = await this.messageRepository.findOne(
          { _environmentId: job._environmentId, _jobId: job._id },
          'seen read lastSeenDate lastReadDate'
        );
        if (message) {
          output = {
            seen: message.seen,
            read: message.read,
            lastSeenDate: message.lastSeenDate || null,
            lastReadDate: message.lastReadDate || null,
          };
        } else {
          /*
           * Provide fallback state for in-app messages to satisfy framework inAppResultSchema validation
           * when message is not found (e.g., cancelled jobs, nv-5120)
           */
          output = {
            seen: false,
            read: false,
            lastSeenDate: null,
            lastReadDate: null,
          };
        }
        break;
      }
      default: {
        break;
      }
    }

    return {
      stepId: job?.step.stepId || job?.step.uuid || '',
      outputs: output ?? {},
      state: {
        status: job?.status,
        error: job?.error,
      },
    };
  }
}
