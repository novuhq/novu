import { Injectable } from '@nestjs/common';
import {
  BridgeError,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  dashboardSanitizeControlValues,
  EnvironmentCacheData,
  ExecuteBridgeRequest,
  ExecuteBridgeRequestCommand,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
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
  ThrottleResult,
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
    private logger: PinoLogger,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ExecuteBridgeJobCommand): Promise<ExecuteOutput | null> {
    const stepId = command.job.step.stepId || command.job.step.uuid;

    const isStateful = !command.job.step.bridgeUrl;

    let workflow: NotificationTemplateEntity | null = null;
    if (isStateful) {
      if (
        command.workflow &&
        (command.workflow.type === ResourceTypeEnum.ECHO || command.workflow.type === ResourceTypeEnum.BRIDGE)
      ) {
        workflow = command.workflow;
      } else {
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
    }

    if (!workflow && isStateful) {
      return null;
    }

    if (!stepId) {
      throw new Error('Step id is not set');
    }

    const environment = await this.getEnvironment(command.environmentId, command.organizationId);

    if (!environment) {
      throw new Error(`Environment id ${command.environmentId} is not found`);
    }

    if (!environment?.echo?.url && isStateful && workflow?.origin === ResourceOriginEnum.EXTERNAL) {
      throw new Error(`Bridge URL is not set for environment id: ${environment._id}`);
    }

    const { subscriber, payload: originalPayload, context, env } = command.variables || {};
    const payload = this.normalizePayload(originalPayload);
    const state = await this.generateState(command);

    const controlValuesResult = isStateful
      ? await this.findControlValues(command, workflow as NotificationTemplateEntity)
      : { controls: command.job.step.controlVariables, stepResolverHash: undefined };
    const variablesStores = controlValuesResult.controls;

    const bridgeEvent: Omit<Event, 'workflowId' | 'stepId' | 'action'> = {
      payload: payload ?? {},
      controls: variablesStores ?? {},
      state,
      subscriber: subscriber ?? {},
      context: context ?? {},
      // biome-ignore lint/style/noNonNullAssertion: <explanation> we always have env.type and env.name
      env: env!,
    };

    const workflowId = isStateful
      ? (workflow as NotificationTemplateEntity).triggers[0].identifier
      : command.identifier;
    const { stepResolverHash } = controlValuesResult;

    const bridgeResponse = await this.sendBridgeRequest({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      /*
       * TODO: We fallback to external due to lack of backfilling origin for existing Workflows.
       * Once we backfill the origin field for existing Workflows, we should remove the fallback.
       */
      workflowOrigin: workflow?.origin || ResourceOriginEnum.EXTERNAL,
      statelessBridgeUrl: command.job.step.bridgeUrl,
      event: bridgeEvent,
      job: command.job,
      stepResolverHash,
      searchParams: {
        workflowId,
        stepId,
        jobId: command.job._id,
      },
    });

    return bridgeResponse;
  }

  private async findControlValues(
    command: ExecuteBridgeJobCommand,
    workflow: NotificationTemplateEntity
  ): Promise<{
    controls: Record<string, unknown>;
    stepResolverHash?: string;
  }> {
    const controlsEntity = await this.controlValuesRepository.findOne({
      _organizationId: command.organizationId,
      _workflowId: workflow._id,
      _stepId: command.job.step._id,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    const rawControls = controlsEntity?.controls;
    const stepResolverHash = command.job.step.template?.stepResolverHash ?? undefined;

    let sanitizedControls: Record<string, unknown> = {};
    if (workflow?.origin === ResourceOriginEnum.NOVU_CLOUD && rawControls && !stepResolverHash) {
      const result = dashboardSanitizeControlValues(this.logger, rawControls, command.job?.step?.template?.type);
      sanitizedControls = result ?? {};
    } else {
      sanitizedControls = rawControls ?? {};
    }

    return {
      controls: sanitizedControls,
      stepResolverHash,
    };
  }

  private normalizePayload(originalPayload: ITriggerPayload = {}): Omit<ITriggerPayload, '__source'> {
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
    organizationId,
    stepResolverHash,
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
      organizationId,
      stepResolverHash,
      processError: async (response) => {
        await this.createExecutionDetails.execute({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: stepResolverHash ? DetailEnum.FAILED_STEP_RESOLVER_EXECUTION : DetailEnum.FAILED_BRIDGE_EXECUTION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(buildBridgeErrorRaw(response)),
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
      case 'custom':
      case 'http_request': {
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
      case 'throttle': {
        const stepOutput = job.stepOutput as ThrottleResult | undefined;

        if (!stepOutput) {
          return {
            throttled: false,
          } satisfies ThrottleResult;
        }

        return {
          throttled: stepOutput.throttled,
          executionCount: stepOutput.executionCount,
          threshold: stepOutput.threshold,
          windowStart: stepOutput.windowStart,
        } satisfies ThrottleResult;
      }
      default:
        return {};
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

  @Instrument()
  private async getEnvironment(environmentId: string, organizationId: string): Promise<EnvironmentCacheData | null> {
    return this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.ENVIRONMENT,
      `${organizationId}:${environmentId}`,
      () =>
        this.environmentRepository.findOne(
          {
            _id: environmentId,
            _organizationId: organizationId,
          },
          'echo apiKeys _id'
        ),
      {
        environmentId,
        organizationId,
        cacheVariant: '_id:apiKeys:echo',
      }
    );
  }
}

function buildBridgeErrorRaw(response: BridgeError): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    message: response.message,
    code: response.code,
  };

  if (response.data !== undefined) {
    raw.data = response.data;
  }

  return raw;
}
