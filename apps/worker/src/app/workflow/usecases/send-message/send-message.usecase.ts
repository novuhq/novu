import { Injectable, Logger } from '@nestjs/common';
import {
  AnalyticsService,
  ConditionsFilter,
  ConditionsFilterCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  GetPreferences,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  ICompileContext,
  IConditionsFilterResponse,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  Instrument,
  InstrumentUsecase,
  PlatformException,
  resolveEnvironmentVariables,
} from '@novu/application-generic';
import {
  ContextRepository,
  EnvironmentRepository,
  EnvironmentVariableRepository,
  JobEntity,
  NotificationTemplateRepository,
  SubscriberRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';
import { ContextResolved, ExecuteOutput } from '@novu/framework/internal';
import {
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  DigestTypeEnum,
  EnvironmentSystemVariables,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IPreferenceChannels,
  PreferencesTypeEnum,
  ResourceTypeEnum,
  StepTypeEnum,
} from '@novu/shared';
import { ExecuteBridgeJob } from '../execute-bridge-job';
import { Digest } from './digest';
import { ExecuteCodeFirstCustomStep } from './execute-code-first-custom-step.usecase';
import { ExecuteHttpRequestStep } from './execute-http-request-step.usecase';
import { SendMessageCommand } from './send-message.command';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageChat } from './send-message-chat.usecase';
import { SendMessageDelay } from './send-message-delay.usecase';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessagePush } from './send-message-push.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageResult, SendMessageStatus } from './send-message-type.usecase';
import { Throttle } from './throttle';

@Injectable()
export class SendMessage {
  constructor(
    private sendMessageEmail: SendMessageEmail,
    private sendMessageSms: SendMessageSms,
    private sendMessageInApp: SendMessageInApp,
    private sendMessageChat: SendMessageChat,
    private sendMessagePush: SendMessagePush,
    private digest: Digest,
    private createExecutionDetails: CreateExecutionDetails,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private sendMessageDelay: SendMessageDelay,
    private throttle: Throttle,
    private executeCodeFirstCustomStep: ExecuteCodeFirstCustomStep,
    private executeHttpRequestStep: ExecuteHttpRequestStep,
    private conditionsFilter: ConditionsFilter,
    private subscriberRepository: SubscriberRepository,
    private tenantRepository: TenantRepository,
    private analyticsService: AnalyticsService,
    private contextRepository: ContextRepository,
    private environmentVariableRepository: EnvironmentVariableRepository,
    private environmentRepository: EnvironmentRepository,
    private executeBridgeJob: ExecuteBridgeJob,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand): Promise<SendMessageResult> {
    const variables = await this.buildVariables(command);

    const stepType = command.step?.template?.type;

    let bridgeResponse: ExecuteOutput | null = null;
    if (requiresBridgeExecution(stepType)) {
      bridgeResponse = await this.executeBridgeJob.execute({
        ...command,
        variables,
        workflow: command.workflow,
      });
    }

    const isBridgeSkipped = bridgeResponse?.options?.skip;
    if (isBridgeSkipped) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SKIPPED_BRIDGE_EXECUTION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ skip: isBridgeSkipped }),
        })
      );
    }

    const { stepCondition, channelPreference } = await this.evaluateFilters(command, variables);
    if (!command.payload?.$on_boarding_trigger) {
      this.sendProcessStepEvent(
        command,
        isBridgeSkipped,
        stepCondition,
        channelPreference.result,
        !!bridgeResponse?.outputs
      );
    }

    const conditionsShouldRun = stepCondition?.passed;
    const preferenceShouldRun = channelPreference.result;
    const isBridgeSkippedShouldRun = !isBridgeSkipped;

    if (!conditionsShouldRun || !preferenceShouldRun || !isBridgeSkippedShouldRun) {
      return {
        status: SendMessageStatus.SKIPPED,
        deliveryLifecycleState: {
          status: DeliveryLifecycleStatusEnum.SKIPPED,
          detail: !channelPreference.result
            ? DeliveryLifecycleDetail.SUBSCRIBER_PREFERENCE
            : DeliveryLifecycleDetail.USER_STEP_CONDITION,
        },
      };
    }

    let severity = command.severity;
    const { overrides } = command;
    if (stepType !== StepTypeEnum.TRIGGER && overrides?.severity && overrides.severity !== severity) {
      severity = overrides.severity;

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.MESSAGE_SEVERITY_OVERRIDDEN,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            from: `${command.severity}`,
            to: `${severity}`,
          }),
        })
      );
    }

    const sendMessageChannelCommand = SendMessageChannelCommand.create({
      ...command,
      compileContext: variables,
      bridgeData: bridgeResponse,
      severity,
    });

    switch (stepType) {
      case StepTypeEnum.TRIGGER: {
        return { status: SendMessageStatus.SUCCESS };
      }
      case StepTypeEnum.SMS: {
        return await this.sendMessageSms.execute(sendMessageChannelCommand);
      }
      case StepTypeEnum.IN_APP: {
        return await this.sendMessageInApp.execute(sendMessageChannelCommand);
      }
      case StepTypeEnum.EMAIL: {
        return await this.sendMessageEmail.execute(sendMessageChannelCommand);
      }
      case StepTypeEnum.CHAT: {
        return await this.sendMessageChat.execute(sendMessageChannelCommand);
      }
      case StepTypeEnum.PUSH: {
        return await this.sendMessagePush.execute(sendMessageChannelCommand);
      }
      case StepTypeEnum.DIGEST: {
        return await this.digest.execute(command);
      }
      case StepTypeEnum.DELAY: {
        return await this.sendMessageDelay.execute(command);
      }
      case StepTypeEnum.THROTTLE: {
        return await this.throttle.execute(command);
      }
      case StepTypeEnum.HTTP_REQUEST: {
        return await this.executeHttpRequestStep.execute(sendMessageChannelCommand);
      }
      case StepTypeEnum.CUSTOM: {
        return await this.executeCodeFirstCustomStep.execute(sendMessageChannelCommand);
      }
      default: {
        throw new Error(`Unsupported step type: ${stepType}`);
      }
    }
  }

  private async evaluateFilters(
    command: SendMessageCommand,
    variables: ICompileContext
  ): Promise<{
    stepCondition: IConditionsFilterResponse;
    channelPreference: { result: boolean; reason?: DetailEnum };
  }> {
    const [stepCondition, channelPreference] = await Promise.all([
      this.evaluateStepCondition(command, variables),
      this.evaluateChannelPreference(command, variables),
    ]);

    return { stepCondition, channelPreference };
  }

  private async evaluateStepCondition(command: SendMessageCommand, variables: ICompileContext) {
    const stepCondition = await this.conditionsFilter.filter(
      ConditionsFilterCommand.create({
        filters: command.job.step.filters || [],
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        step: command.step,
        job: command.job,
        variables,
      })
    );

    if (!stepCondition?.passed) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SKIPPED_STEP_BY_CONDITIONS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            filter: {
              conditions: stepCondition?.conditions,
              passed: stepCondition?.passed,
            },
          }),
        })
      );
    }

    return stepCondition;
  }

  private sendProcessStepEvent(
    command: SendMessageCommand,
    isBridgeSkipped: boolean | undefined,
    filterResult: IConditionsFilterResponse | null,
    preferredResult: boolean | null,
    isBridgeWorkflow: boolean
  ) {
    const usedFilters = filterResult?.conditions?.reduce(ConditionsFilter.sumFilters, {
      filters: [],
      failedFilters: [],
      passedFilters: [],
    });

    const { digest } = command.job;
    let timedInfo: Record<string, unknown> = {};

    if (digest && 'type' in digest && digest.type === DigestTypeEnum.TIMED) {
      const timedDigest = digest as IDigestTimedMetadata;
      if (timedDigest.timed) {
        timedInfo = {
          digestAtTime: timedDigest.timed.atTime,
          digestWeekDays: timedDigest.timed.weekDays,
          digestMonthDays: timedDigest.timed.monthDays,
          digestOrdinal: timedDigest.timed.ordinal,
          digestOrdinalValue: timedDigest.timed.ordinalValue,
        };
      }
    }

    /**
     * userId is empty string due to mixpanel hot shard events.
     * This is intentional, so that mixpanel can automatically reshard it.
     */
    this.analyticsService.mixpanelTrack('Process Workflow Step - [Triggers]', '', {
      workflowType: isBridgeWorkflow ? ResourceTypeEnum.BRIDGE : ResourceTypeEnum.REGULAR,
      _template: command.job._templateId,
      _organization: command.organizationId,
      _environment: command.environmentId,
      _subscriber: command.job?._subscriberId,
      provider: command.job?.providerId,
      delay: command.job?.delay,
      jobType: command.job?.type,
      digestType: digest && 'type' in digest ? digest.type : undefined,
      digestEventsCount: digest?.events?.length,
      digestUnit: digest && 'unit' in digest ? digest.unit : undefined,
      digestAmount: digest && 'amount' in digest ? digest.amount : undefined,
      digestBackoff:
        (digest && 'type' in digest && digest.type === DigestTypeEnum.BACKOFF) ||
        (digest as IDigestRegularMetadata)?.backoff === true,
      ...timedInfo,
      filterPassed: filterResult?.passed,
      preferencesPassed: preferredResult,
      isBridgeSkipped,
      ...(usedFilters || {}),
      source: command.payload?.__source || 'api',
    });
  }

  @Instrument()
  private async evaluateChannelPreference(
    command: SendMessageCommand,
    compileContext: ICompileContext
  ): Promise<{ result: boolean; reason?: DetailEnum }> {
    const { job } = command;

    if (!this.isChannelStep(job)) {
      return { result: true };
    }

    const workflow =
      command.workflow ??
      (await this.getWorkflow({
        _id: job._templateId,
        environmentId: job._environmentId,
      }));

    const subscriber = compileContext.subscriber;
    if (!subscriber) throw new PlatformException(`Subscriber not found with id ${job._subscriberId}`);

    let subscriberPreference: { enabled: boolean; channels: IPreferenceChannels };
    let subscriberPreferenceType: PreferencesTypeEnum;
    if (command.statelessPreferences) {
      /*
       * Stateless Workflow executions do not have their definitions stored in the database.
       * Their preferences are available in the command instead.
       *
       * TODO: Refactor the send-message flow to better handle stateless workflows
       */
      const workflowPreference = GetPreferences.mapWorkflowPreferencesToChannelPreferences(
        command.statelessPreferences
      );
      subscriberPreference = {
        enabled: true,
        channels: workflowPreference,
      };
      subscriberPreferenceType = PreferencesTypeEnum.WORKFLOW_RESOURCE;
    } else {
      if (!workflow) {
        throw new PlatformException(`Workflow with id '${job._templateId}' was not found`);
      }

      const { preference, type } = await this.getSubscriberTemplatePreferenceUsecase.execute(
        GetSubscriberTemplatePreferenceCommand.create({
          organizationId: job._organizationId,
          subscriberId: subscriber.subscriberId,
          environmentId: job._environmentId,
          template: workflow,
          subscriber,
          tenant: job.tenant,
          includeInactiveChannels: false,
          contextKeys: job.contextKeys,
        })
      );
      subscriberPreference = preference;
      subscriberPreferenceType = type;
    }

    const result = this.stepPreferred(subscriberPreference, job);

    const preferenceDetailFromPreferenceType: Record<
      Exclude<PreferencesTypeEnum, PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW>,
      DetailEnum
    > = {
      [PreferencesTypeEnum.WORKFLOW_RESOURCE]: DetailEnum.STEP_FILTERED_BY_WORKFLOW_RESOURCE_PREFERENCES,
      [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_WORKFLOW_PREFERENCES,
      [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_GLOBAL_PREFERENCES,
      [PreferencesTypeEnum.USER_WORKFLOW]: DetailEnum.STEP_FILTERED_BY_USER_WORKFLOW_PREFERENCES,
    };

    const reason = preferenceDetailFromPreferenceType[subscriberPreferenceType];
    if (!result) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: reason,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(subscriberPreference),
        })
      );

      Logger.log(
        {
          reason,
          subscriberId: job.subscriberId,
          templateId: job._templateId,
          transactionId: job.transactionId,
          channel: job.type,
        },
        'Skipped step by preference'
      );
    }

    return { result, reason };
  }

  @Instrument()
  private async buildVariables(command: SendMessageCommand): Promise<ICompileContext> {
    const [subscriber, actor, tenant, context, envVars, environmentEntity] = await Promise.all([
      this.getSubscriberBySubscriberId({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
      command.job.actorId &&
        this.getSubscriberBySubscriberId({
          subscriberId: command.job.actorId,
          _environmentId: command.environmentId,
        }),
      this.handleTenantExecution(command.job),
      this.resolveContext(command),
      this.getEnvironmentVariables(command),
      this.environmentRepository.findByIdAndOrganization(command.environmentId, command.organizationId),
    ]);

    if (!subscriber) throw new PlatformException('Subscriber not found');
    if (!environmentEntity) throw new PlatformException('EnvironmentEntity not found');

    // Compile-safe: adding a required field to EnvironmentSystemVariables will cause a TS error here
    const environmentSystemVars: EnvironmentSystemVariables = {
      name: environmentEntity.name,
      type: environmentEntity.type,
    };

    const env: EnvironmentSystemVariables & Record<string, string> = {
      ...envVars,
      ...environmentSystemVars,
    };

    return {
      subscriber,
      payload: command.payload,
      step: {
        digest: !!command.events?.length,
        events: command.events,
        total_count: command.events?.length,
      },
      ...(tenant && { tenant }),
      ...(actor && { actor }),
      ...(context && { context }),
      env,
    };
  }

  @Instrument()
  private async getEnvironmentVariables(command: SendMessageCommand): Promise<Record<string, string>> {
    const cacheKey = `${command.organizationId}:${command.environmentId}`;

    return this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.ENVIRONMENT_VARIABLES,
      cacheKey,
      async () => {
        try {
          const rawEnvVars = await this.environmentVariableRepository.findByEnvironment(
            command.organizationId,
            command.environmentId
          );

          return resolveEnvironmentVariables(rawEnvVars);
        } catch (error) {
          Logger.warn(
            { err: error, organizationId: command.organizationId, environmentId: command.environmentId },
            'Failed to fetch environment variables, falling back to empty object'
          );

          return {};
        }
      },
      {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }
    );
  }

  @Instrument()
  private async resolveContext(command: SendMessageCommand): Promise<ContextResolved> {
    const { contextKeys, environmentId, organizationId } = command;

    if (contextKeys.length === 0) {
      return {} as ContextResolved;
    }

    const contexts = await this.contextRepository.findByKeys(environmentId, organizationId, contextKeys);

    return contexts.reduce((acc, context) => {
      acc[context.type] = {
        id: context.id,
        data: context.data,
      };
      return acc;
    }, {} as ContextResolved);
  }

  private async getWorkflow({ _id, environmentId }: { _id: string; environmentId: string }) {
    return await this.notificationTemplateRepository.findById(_id, environmentId);
  }

  public async getSubscriberBySubscriberId({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }) {
    return await this.subscriberRepository.findOne({
      _environmentId,
      subscriberId,
    });
  }

  @Instrument()
  private stepPreferred(preference: { enabled: boolean; channels: IPreferenceChannels }, job: JobEntity) {
    const workflowPreferred = preference.enabled;

    const channelPreferred = Object.keys(preference.channels || {}).some(
      (channelKey) => channelKey === job.type && preference.channels?.[job.type]
    );

    return workflowPreferred && channelPreferred;
  }

  private isChannelStep(job: JobEntity) {
    const channels = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH, StepTypeEnum.CHAT];

    return !!channels.find((channel) => channel === job.type);
  }

  protected async sendSelectedTenantExecution(job: JobEntity, tenant: TenantEntity) {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.TENANT_CONTEXT_SELECTED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({
          identifier: tenant?.identifier,
          name: tenant?.name,
          data: tenant?.data,
          createdAt: tenant?.createdAt,
          updatedAt: tenant?.updatedAt,
          _environmentId: tenant?._environmentId,
          _id: tenant?._id,
        }),
      })
    );
  }

  protected async handleTenantExecution(job: JobEntity): Promise<TenantEntity | null> {
    const tenantIdentifier = job.tenant?.identifier;

    let tenant: TenantEntity | null = null;
    if (tenantIdentifier) {
      tenant = await this.tenantRepository.findOne({
        _environmentId: job._environmentId,
        identifier: tenantIdentifier,
      });
      if (!tenant) {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
            detail: DetailEnum.TENANT_NOT_FOUND,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
            raw: JSON.stringify({
              tenantIdentifier,
            }),
          })
        );

        return null;
      }
      await this.sendSelectedTenantExecution(job, tenant);
    }

    return tenant;
  }
}

function requiresBridgeExecution(stepType: StepTypeEnum | undefined): boolean {
  if (!stepType) return false;

  return ![StepTypeEnum.TRIGGER, StepTypeEnum.DIGEST, StepTypeEnum.DELAY, StepTypeEnum.HTTP_REQUEST].includes(stepType);
}
