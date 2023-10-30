import { Injectable } from '@nestjs/common';
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
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  FilterConditionsService,
  FilterProcessingDetails,
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  IFilterConditionsResponse,
  IFilterData,
  Instrument,
  InstrumentUsecase,
  PlatformException,
  BulkCreateExecutionDetails,
  BulkCreateExecutionDetailsCommand,
} from '@novu/application-generic';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  NotificationTemplateRepository,
  SubscriberRepository,
} from '@novu/dal';

import { SendMessageCommand } from './send-message.command';
import { SendMessageDelay } from './send-message-delay.usecase';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessageChat } from './send-message-chat.usecase';
import { SendMessagePush } from './send-message-push.usecase';
import { Digest } from './digest';

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
    private bulkCreateExecutionDetails: BulkCreateExecutionDetails,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private getSubscriberGlobalPreferenceUsecase: GetSubscriberGlobalPreference,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository,
    private subscriberRepository: SubscriberRepository,
    private sendMessageDelay: SendMessageDelay,
    private filterConditions: FilterConditionsService,
    private analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const shouldRun = await this.filter(command);
    const preferred = await this.filterPreferredChannels(command.job);

    const stepType = command.step?.template?.type;

    if (!command.payload?.$on_boarding_trigger) {
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

      this.analyticsService.mixpanelTrack('Process Workflow Step - [Triggers]', '', {
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
        filterPassed: shouldRun,
        preferencesPassed: preferred,
        ...(shouldRun.usedFilters || {}),
        source: command.payload.__source || 'api',
      });
    }

    if (!shouldRun.passed || !preferred) {
      await this.jobRepository.updateStatus(command.environmentId, command.jobId, JobStatusEnum.CANCELED);

      return;
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

    switch (stepType) {
      case StepTypeEnum.SMS:
        return await this.sendMessageSms.execute(command);
      case StepTypeEnum.IN_APP:
        return await this.sendMessageInApp.execute(command);
      case StepTypeEnum.EMAIL:
        return await this.sendMessageEmail.execute(command);
      case StepTypeEnum.CHAT:
        return await this.sendMessageChat.execute(command);
      case StepTypeEnum.PUSH:
        return await this.sendMessagePush.execute(command);
      case StepTypeEnum.DIGEST:
        return await this.digest.execute(command);
      case StepTypeEnum.DELAY:
        return await this.sendMessageDelay.execute(command);
    }
  }

  private async filter(command: SendMessageCommand): Promise<IFilterConditionsResponse> {
    const { environmentId, identifier, job, organizationId, subscriberId, transactionId } = command;
    const { step } = job;
    const shouldRun = await this.filterConditions.filter(step.filters || [], command.payload, {
      environmentId,
      identifier,
      job,
      organizationId,
      subscriberId,
      transactionId,
    });

    await this.sendBulkProcessingStepFilterExecutionDetails(job, shouldRun.details);

    if (!shouldRun.passed) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.FILTER_STEPS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            payload: shouldRun.data,
            filters: command.step.filters,
          }),
        })
      );
    }

    return shouldRun;
  }

  @Instrument()
  private async sendBulkProcessingStepFilterExecutionDetails(
    job: JobEntity,
    filterProcessingDetails: FilterProcessingDetails[]
  ): Promise<void> {
    await this.bulkCreateExecutionDetails.execute(
      BulkCreateExecutionDetailsCommand.create({
        organizationId: job._organizationId,
        environmentId: job._environmentId,
        subscriberId: job._subscriberId,
        details: filterProcessingDetails.map((raw) => {
          return {
            ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
            detail: DetailEnum.PROCESSING_STEP_FILTER,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.PENDING,
            isTest: false,
            isRetry: false,
            details: raw.toString(),
          };
        }),
      })
    );
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
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
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

    const buildCommand = GetSubscriberTemplatePreferenceCommand.create({
      organizationId: job._organizationId,
      subscriberId: subscriber.subscriberId,
      environmentId: job._environmentId,
      template,
      subscriber,
    });

    const { preference } = await this.getSubscriberTemplatePreferenceUsecase.execute(buildCommand);
    const result = this.stepPreferred(preference, job);

    if (!result) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
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

    const channels = Object.keys(preference.channels);
    // Handles the case where the channel is not defined in the preference. i.e, channels = {}
    const channelPreferred =
      channels.length > 0
        ? channels.some((channelKey) => channelKey === job.type && preference.channels[job.type])
        : true;

    return templatePreferred && channelPreferred;
  }

  private isActionStep(job: JobEntity) {
    const channels = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH, StepTypeEnum.CHAT];

    return !channels.find((channel) => channel === job.type);
  }
}
