import { Injectable } from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  dashboardSanitizeControlValues,
  ExecuteBridgeRequest,
  ExecuteBridgeRequestCommand,
  Instrument,
  InstrumentUsecase,
  PinoLogger,
} from '@novu/application-generic';
import {
  ControlValuesRepository,
  EnvironmentRepository,
  JobEntity,
  JobRepository,
  MessageRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  DelayResult,
  DigestResult,
  Event,
  ExecuteOutput,
  InAppResult,
  PostActionEnum,
  State,
} from '@novu/framework/internal';
import {
  ControlValuesLevelEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  ITriggerPayload,
  JobStatusEnum,
  ResourceOriginEnum,
  ResourceTypeEnum,
} from '@novu/shared';
import { ExecuteBridgeJobCommand } from './execute-bridge-job.command';

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
  ) {
    this.logger.setContext(this.constructor.name);
  }

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
            $in: [ResourceTypeEnum.ECHO, ResourceTypeEnum.BRIDGE],
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

    if (!environment?.echo?.url && isStateful && workflow?.origin === ResourceOriginEnum.EXTERNAL) {
      throw new Error(`Bridge URL is not set for environment id: ${environment._id}`);
    }

    const { subscriber, payload: originalPayload, context } = command.variables || {};
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
      context: context ?? {},
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
      workflowOrigin: workflow?.origin || ResourceOriginEnum.EXTERNAL,
      statelessBridgeUrl: command.job.step.bridgeUrl,
      event: bridgeEvent,
      job: command.job,
      searchParams: {
        workflowId,
        stepId,
        jobId: command.job._id,
      },
    });

    return bridgeResponse;
  }

  private async findControlValues(command: ExecuteBridgeJobCommand, workflow: NotificationTemplateEntity) {
    const controls = await this.controlValuesRepository.findOne({
      _organizationId: command.organizationId,
      _workflowId: workflow._id,
      _stepId: command.job.step._id,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    if (workflow?.origin === ResourceOriginEnum.NOVU_CLOUD) {
      return controls?.controls
        ? dashboardSanitizeControlValues(this.logger, controls.controls, command.job?.step?.template?.type)
        : {};
    }

    return controls?.controls;
  }

  private normalizePayload(originalPayload: ITriggerPayload = {}) {
    // Remove internal params
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
      workflowOrigin,
      environmentId,
      processError: async (response) => {
        await this.createExecutionDetails.execute({
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
            cause: response.cause,
          }),
        });
      },
    }) as Promise<ExecuteOutput>;
  }

  private async mapOutput(job: JobEntity) {
    switch (job.type) {
      case 'delay': {
        return {
          duration: Date.now() - new Date(job.createdAt).getTime(),
        } satisfies DelayResult;
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
        const events = [...digestJobs, job]
          .map((digestJob) => ({
            id: digestJob._id,
            time: digestJob.createdAt,
            payload: digestJob.payload ?? {},
          }))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        return {
          events,
          eventCount: events.length,
        } satisfies DigestResult;
      }
      case 'custom': {
        return job.stepOutput || {};
      }
      case 'in_app': {
        const message = await this.messageRepository.findOne(
          { _environmentId: job._environmentId, _jobId: job._id },
          'seen read lastSeenDate lastReadDate'
        );
        if (message) {
          return {
            seen: message.seen,
            read: message.read,
            lastSeenDate: message.lastSeenDate || null,
            lastReadDate: message.lastReadDate || null,
          } satisfies InAppResult;
        } else {
          /*
           * Provide fallback state for in-app messages to satisfy framework inAppResultSchema validation
           * when message is not found (e.g., cancelled jobs, nv-5120)
           */
          return {
            seen: false,
            read: false,
            lastSeenDate: null,
            lastReadDate: null,
          } satisfies InAppResult;
        }
      }
      default: {
        return {};
      }
    }
  }

  @Instrument()
  private async mapState(job: JobEntity) {
    const output = await this.mapOutput(job);

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
