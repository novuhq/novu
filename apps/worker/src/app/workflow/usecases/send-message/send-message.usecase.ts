import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  DigestTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestRegularMetadata,
  IPreferenceChannels,
  StepTypeEnum,
} from '@novu/shared';
import {
  AnalyticsService,
  buildNotificationTemplateKey,
  buildSubscriberKey,
  CachedEntity,
  ConditionsFilter,
  ConditionsFilterCommand,
  DetailEnum,
  ExecuteOutput,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  IConditionsFilterResponse,
  IFilterVariables,
  Instrument,
  InstrumentUsecase,
  IBridgeChannelResponse,
  IUseCaseInterfaceInline,
  NormalizeVariables,
  NormalizeVariablesCommand,
  requireInject,
} from '@novu/application-generic';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  NotificationTemplateRepository,
  SubscriberRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';

import { SendMessageCommand } from './send-message.command';
import { SendMessageDelay } from './send-message-delay.usecase';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessageChat } from './send-message-chat.usecase';
import { SendMessagePush } from './send-message-push.usecase';
import { Digest } from './digest';
import { PlatformException } from '../../../shared/utils';
import { ExecuteStepCustom } from './execute-step-custom.usecase';

@Injectable()
export class SendMessage {
  private resonateUsecase: IUseCaseInterfaceInline;

  constructor(
    private sendMessageEmail: SendMessageEmail,
    private sendMessageSms: SendMessageSms,
    private sendMessageInApp: SendMessageInApp,
    private sendMessageChat: SendMessageChat,
    private sendMessagePush: SendMessagePush,
    private digest: Digest,
    private executionLogRoute: ExecutionLogRoute,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private getSubscriberGlobalPreferenceUsecase: GetSubscriberGlobalPreference,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository,
    private sendMessageDelay: SendMessageDelay,
    private executeStepCustom: ExecuteStepCustom,
    private conditionsFilter: ConditionsFilter,
    private subscriberRepository: SubscriberRepository,
    private tenantRepository: TenantRepository,
    private analyticsService: AnalyticsService,
    private normalizeVariablesUsecase: NormalizeVariables,
    protected moduleRef: ModuleRef
  ) {
    this.resonateUsecase = requireInject('resonate', this.moduleRef);
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand): Promise<{ status: 'success' | 'canceled' }> {
    const payload = await this.buildCompileContext(command);

    const variables = await this.normalizeVariablesUsecase.execute(
      NormalizeVariablesCommand.create({
        filters: command.job.step.filters || [],
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        step: command.step,
        job: command.job,
        variables: payload,
      })
    );

    const stepType = command.step?.template?.type;

    let resonateResponse: ExecuteOutput<IBridgeChannelResponse> | null = null;
    if (![StepTypeEnum.DIGEST, StepTypeEnum.DELAY, StepTypeEnum.TRIGGER].includes(stepType as any)) {
      resonateResponse = await this.resonateUsecase.execute<
        SendMessageCommand & { variables: IFilterVariables },
        ExecuteOutput<IBridgeChannelResponse> | null
      >({
        ...command,
        variables,
      });
    }
    const bridgeSkip = resonateResponse?.options?.skip;
    const { filterResult, channelPreferenceResult } = await this.getStepExecutionHalt(bridgeSkip, command, variables);

    if (!command.payload?.$on_boarding_trigger) {
      this.sendProcessStepEvent(
        command,
        bridgeSkip,
        filterResult,
        channelPreferenceResult,
        !!resonateResponse?.outputs
      );
    }

    if (!filterResult?.passed || !channelPreferenceResult || bridgeSkip) {
      await this.jobRepository.updateStatus(command.environmentId, command.jobId, JobStatusEnum.CANCELED);

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.FILTER_STEPS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            ...(filterResult ? { filter: { conditions: filterResult?.conditions, passed: filterResult?.passed } } : {}),
            ...(channelPreferenceResult ? { preferences: { passed: channelPreferenceResult } } : {}),
            ...(bridgeSkip ? { skip: bridgeSkip } : {}),
          }),
        })
      );

      return { status: 'canceled' };
    }

    if (stepType !== StepTypeEnum.DELAY) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: stepType === StepTypeEnum.DIGEST ? DetailEnum.START_DIGESTING : DetailEnum.START_SENDING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }

    const sendMessageCommand = SendMessageCommand.create({
      ...command,
      compileContext: payload,
      bridgeData: resonateResponse,
    });

    switch (stepType) {
      case StepTypeEnum.SMS: {
        await this.sendMessageSms.execute(sendMessageCommand);
        break;
      }
      case StepTypeEnum.IN_APP: {
        await this.sendMessageInApp.execute(sendMessageCommand);
        break;
      }
      case StepTypeEnum.EMAIL: {
        await this.sendMessageEmail.execute(sendMessageCommand);
        break;
      }
      case StepTypeEnum.CHAT: {
        await this.sendMessageChat.execute(sendMessageCommand);
        break;
      }
      case StepTypeEnum.PUSH: {
        await this.sendMessagePush.execute(sendMessageCommand);
        break;
      }
      case StepTypeEnum.DIGEST: {
        await this.digest.execute(command);
        break;
      }
      case StepTypeEnum.DELAY: {
        await this.sendMessageDelay.execute(command);
        break;
      }
      case StepTypeEnum.CUSTOM: {
        await this.executeStepCustom.execute(sendMessageCommand);
        break;
      }
    }

    return { status: 'success' };
  }

  private async getStepExecutionHalt(
    bridgeSkip: boolean | undefined,
    command: SendMessageCommand,
    variables: IFilterVariables
  ): Promise<{ filterResult: IConditionsFilterResponse | null; channelPreferenceResult: boolean | null }> {
    const skipHalt = this.shouldSkipHalt(bridgeSkip, command.job?.step?.bridgeUrl);
    if (skipHalt) {
      return { filterResult: { passed: true, conditions: [], variables: {} }, channelPreferenceResult: true };
    }

    const [filterResult, channelPreferenceResult] = await Promise.all([
      this.filter(command, variables),
      this.filterPreferredChannels(command.job),
    ]);

    return { filterResult, channelPreferenceResult };
  }

  /**
   * This function checks if a bridge skip is happening.
   *
   * - If `bridgeSkip` is true (highest priority), skips all checks.
   * - If `bridgeUrl` is provided, skips all checks (use `skip` option in workflow definition instead).
   *
   * @param bridgeSkip Whether to skip bridge checks (optional).
   * @param bridgeUrl URL of the bridge (optional).
   * @return True if bridge skip is happening, false otherwise.
   */
  private shouldSkipHalt(bridgeSkip: boolean | undefined, bridgeUrl: string | undefined): boolean {
    return bridgeSkip === true || !!bridgeUrl;
  }

  private async filter(command: SendMessageCommand, variables: IFilterVariables) {
    return await this.conditionsFilter.filter(
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
  }

  private sendProcessStepEvent(
    command: SendMessageCommand,
    resonateSkip: boolean | undefined,
    filterResult: IConditionsFilterResponse | null,
    preferredResult: boolean | null,
    isEcho: boolean
  ) {
    const usedFilters = filterResult?.conditions?.reduce(ConditionsFilter.sumFilters, {
      filters: [],
      failedFilters: [],
      passedFilters: [],
    });

    const digest = command.job.digest;
    let timedInfo: any = {};

    if (digest && digest.type === DigestTypeEnum.TIMED && digest.timed) {
      timedInfo = {
        digestAtTime: digest.timed.atTime,
        digestWeekDays: digest.timed.weekDays,
        digestMonthDays: digest.timed.monthDays,
        digestOrdinal: digest.timed.ordinal,
        digestOrdinalValue: digest.timed.ordinalValue,
      };
    }

    /**
     * userId is empty string due to mixpanel hot shard events.
     * This is intentional, so that mixpanel can automatically reshard it.
     */
    this.analyticsService.mixpanelTrack('Process Workflow Step - [Triggers]', '', {
      workflowType: isEcho ? 'ECHO' : 'REGULAR',
      _template: command.job._templateId,
      _organization: command.organizationId,
      _environment: command.environmentId,
      _subscriber: command.job?._subscriberId,
      provider: command.job?.providerId,
      delay: command.job?.delay,
      jobType: command.job?.type,
      digestType: digest?.type,
      digestEventsCount: digest?.events?.length,
      digestUnit: digest && 'unit' in digest ? digest.unit : undefined,
      digestAmount: digest && 'amount' in digest ? digest.amount : undefined,
      digestBackoff: digest?.type === DigestTypeEnum.BACKOFF || (digest as IDigestRegularMetadata)?.backoff === true,
      ...timedInfo,
      filterPassed: filterResult?.passed,
      preferencesPassed: preferredResult,
      echoSkip: resonateSkip,
      ...(usedFilters || {}),
      source: command.payload.__source || 'api',
    });
  }

  @Instrument()
  private async filterPreferredChannels(job: JobEntity): Promise<boolean> {
    const template = await this.getNotificationTemplate({
      _id: job._templateId,
      environmentId: job._environmentId,
    });
    if (!template) {
      throw new PlatformException(`Notification template ${job._templateId} is not found`);
    }

    if (template.critical || this.isActionStep(job)) {
      return true;
    }

    const subscriber = await this.getSubscriberBySubscriberId({
      _environmentId: job._environmentId,
      subscriberId: job.subscriberId,
    });
    if (!subscriber) throw new PlatformException('Subscriber not found with id ' + job._subscriberId);

    const { preference: globalPreference } = await this.getSubscriberGlobalPreferenceUsecase.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: job._organizationId,
        environmentId: job._environmentId,
        subscriberId: job.subscriberId,
      })
    );

    const globalPreferenceResult = this.stepPreferred(globalPreference, job);

    if (!globalPreferenceResult) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_FILTERED_BY_GLOBAL_PREFERENCES,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(globalPreference),
        })
      );

      return false;
    }

    const { preference } = await this.getSubscriberTemplatePreferenceUsecase.execute(
      GetSubscriberTemplatePreferenceCommand.create({
        organizationId: job._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: job._environmentId,
        template,
        subscriber,
        tenant: job.tenant,
      })
    );

    const result = this.stepPreferred(preference, job);

    if (!result) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_FILTERED_BY_PREFERENCES,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(preference),
        })
      );
    }

    return result;
  }

  @Instrument()
  private async buildCompileContext(command: SendMessageCommand): Promise<IFilterVariables> {
    const [subscriber, actor, tenant] = await Promise.all([
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
    ]);

    if (!subscriber) throw new PlatformException('Subscriber not found');

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
    };
  }

  @CachedEntity({
    builder: (command: { _id: string; environmentId: string }) =>
      buildNotificationTemplateKey({
        _environmentId: command.environmentId,
        _id: command._id,
      }),
  })
  private async getNotificationTemplate({ _id, environmentId }: { _id: string; environmentId: string }) {
    return await this.notificationTemplateRepository.findById(_id, environmentId);
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
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
    const templatePreferred = preference.enabled;

    const channelPreferred = Object.keys(preference.channels).some(
      (channelKey) => channelKey === job.type && preference.channels[job.type]
    );

    return templatePreferred && channelPreferred;
  }

  private isActionStep(job: JobEntity) {
    const channels = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH, StepTypeEnum.CHAT];

    return !channels.find((channel) => channel === job.type);
  }

  protected async sendSelectedTenantExecution(job: JobEntity, tenant: TenantEntity) {
    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(job),
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
        await this.executionLogRoute.execute(
          ExecutionLogRouteCommand.create({
            ...ExecutionLogRouteCommand.getDetailsFromJob(job),
            detail: DetailEnum.TENANT_NOT_FOUND,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
            raw: JSON.stringify({
              tenantIdentifier: tenantIdentifier,
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
