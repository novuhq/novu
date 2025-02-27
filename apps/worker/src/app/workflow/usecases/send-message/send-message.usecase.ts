import { Injectable } from '@nestjs/common';

import {
  DigestTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestRegularMetadata,
  IPreferenceChannels,
  PreferencesTypeEnum,
  StepTypeEnum,
  WorkflowTypeEnum,
} from '@novu/shared';
import {
  AnalyticsService,
  buildSubscriberKey,
  CachedEntity,
  ConditionsFilter,
  ConditionsFilterCommand,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  GetPreferences,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  IConditionsFilterResponse,
  IFilterVariables,
  Instrument,
  InstrumentUsecase,
  NormalizeVariables,
  NormalizeVariablesCommand,
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
import { ExecuteOutput } from '@novu/framework/internal';

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
import { ExecuteBridgeJob } from '../execute-bridge-job';

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
    private jobRepository: JobRepository,
    private sendMessageDelay: SendMessageDelay,
    private executeStepCustom: ExecuteStepCustom,
    private conditionsFilter: ConditionsFilter,
    private subscriberRepository: SubscriberRepository,
    private tenantRepository: TenantRepository,
    private analyticsService: AnalyticsService,
    private normalizeVariablesUsecase: NormalizeVariables,
    private executeBridgeJob: ExecuteBridgeJob
  ) {}

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

    let bridgeResponse: ExecuteOutput | null = null;
    if (isChannelStep(stepType)) {
      bridgeResponse = await this.executeBridgeJob.execute({
        ...command,
        variables,
      });
    }
    const isBridgeSkipped = bridgeResponse?.options?.skip;
    const { stepCondition, channelPreference } = await this.evaluateFilters(isBridgeSkipped, command, variables);

    if (!command.payload?.$on_boarding_trigger) {
      this.sendProcessStepEvent(command, isBridgeSkipped, stepCondition, channelPreference, !!bridgeResponse?.outputs);
    }

    if (!stepCondition?.passed || !channelPreference || isBridgeSkipped) {
      await this.jobRepository.updateStatus(command.environmentId, command.jobId, JobStatusEnum.CANCELED);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.FILTER_STEPS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            ...(stepCondition
              ? {
                  filter: {
                    conditions: stepCondition?.conditions,
                    passed: stepCondition?.passed,
                  },
                }
              : {}),
            ...(channelPreference ? { preferences: { passed: channelPreference } } : {}),
            ...(isBridgeSkipped ? { skip: isBridgeSkipped } : {}),
          }),
        })
      );

      return { status: 'canceled' };
    }

    if (stepType !== StepTypeEnum.DELAY) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
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
      bridgeData: bridgeResponse,
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
      default: {
        break;
      }
    }

    return { status: 'success' };
  }

  private async evaluateFilters(
    bridgeSkip: boolean | undefined,
    command: SendMessageCommand,
    variables: IFilterVariables
  ): Promise<{
    stepCondition: IConditionsFilterResponse | null;
    channelPreference: boolean | null;
  }> {
    if (bridgeSkip === true) {
      return {
        stepCondition: { passed: true, conditions: [], variables: {} },
        channelPreference: true,
      };
    }

    const [stepCondition, channelPreference] = await Promise.all([
      this.evaluateStepCondition(command, variables),
      this.evaluateChannelPreference(command),
    ]);

    return { stepCondition, channelPreference };
  }

  private async evaluateStepCondition(command: SendMessageCommand, variables: IFilterVariables) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      workflowType: isBridgeWorkflow ? WorkflowTypeEnum.BRIDGE : WorkflowTypeEnum.REGULAR,
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
      isBridgeSkipped,
      ...(usedFilters || {}),
      source: command.payload.__source || 'api',
    });
  }

  @Instrument()
  private async evaluateChannelPreference(command: SendMessageCommand): Promise<boolean> {
    const { job } = command;

    if (this.isActionStep(job)) {
      return true;
    }

    const workflow = await this.getWorkflow({
      _id: job._templateId,
      environmentId: job._environmentId,
    });

    const subscriber = await this.getSubscriberBySubscriberId({
      _environmentId: job._environmentId,
      subscriberId: job.subscriberId,
    });
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
        })
      );
      subscriberPreference = preference;
      subscriberPreferenceType = type;
    }

    const result = this.stepPreferred(subscriberPreference, job);

    const preferenceDetailFromPreferenceType: Record<PreferencesTypeEnum, DetailEnum> = {
      [PreferencesTypeEnum.WORKFLOW_RESOURCE]: DetailEnum.STEP_FILTERED_BY_WORKFLOW_RESOURCE_PREFERENCES,
      [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_WORKFLOW_PREFERENCES,
      [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_GLOBAL_PREFERENCES,
      [PreferencesTypeEnum.USER_WORKFLOW]: DetailEnum.STEP_FILTERED_BY_USER_WORKFLOW_PREFERENCES,
    };

    if (!result) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: preferenceDetailFromPreferenceType[subscriberPreferenceType],
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(subscriberPreference),
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

  private async getWorkflow({ _id, environmentId }: { _id: string; environmentId: string }) {
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
    const workflowPreferred = preference.enabled;

    const channelPreferred = Object.keys(preference.channels).some(
      (channelKey) => channelKey === job.type && preference.channels[job.type]
    );

    return workflowPreferred && channelPreferred;
  }

  private isActionStep(job: JobEntity) {
    const channels = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH, StepTypeEnum.CHAT];

    return !channels.find((channel) => channel === job.type);
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

function isChannelStep(stepType: StepTypeEnum | undefined) {
  return ![StepTypeEnum.DIGEST, StepTypeEnum.DELAY, StepTypeEnum.TRIGGER].includes(stepType as StepTypeEnum);
}
