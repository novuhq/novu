import { Injectable, Logger } from '@nestjs/common';

import {
  JobRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  IntegrationRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  InAppProviderIdEnum,
  ISubscribersDefine,
  ProvidersIdEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
} from '@novu/shared';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import {
  StoreSubscriberJobs,
  StoreSubscriberJobsCommand,
} from '../store-subscriber-jobs';
import {
  CreateNotificationJobs,
  CreateNotificationJobsCommand,
} from '../create-notification-jobs';
import { PinoLogger } from 'nestjs-pino';
import { ApiException } from '../../utils/exceptions';
import {
  ProcessSubscriber,
  ProcessSubscriberCommand,
} from '../process-subscriber';
import { AnalyticsService } from '../../services/analytics.service';
import { ProcessTenant } from '../process-tenant';
import { SubscriberJobBoundCommand } from './subscriber-job-bound.command';
import {
  buildNotificationTemplateKey,
  CachedEntity,
} from '../../services/cache';

const LOG_CONTEXT = 'SubscriberJobBoundUseCase';

@Injectable()
export class SubscriberJobBound {
  constructor(
    private storeSubscriberJobs: StoreSubscriberJobs,
    private createNotificationJobs: CreateNotificationJobs,
    private processSubscriber: ProcessSubscriber,
    private integrationRepository: IntegrationRepository,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processTenant: ProcessTenant,
    private logger: PinoLogger,
    private analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  async execute(command: SubscriberJobBoundCommand) {
    this.logger.assign({
      transactionId: command.transactionId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const {
      subscriber,
      templateId,
      environmentId,
      organizationId,
      userId,
      actor,
      tenant,
      identifier,
      _subscriberSource,
      requestCategory,
    } = command;

    const template = await this.getNotificationTemplate({
      _id: templateId,
      environmentId: environmentId,
    });

    const templateProviderIds = await this.getProviderIdsForTemplate(
      environmentId,
      template
    );

    await this.validateSubscriberIdProperty(subscriber);

    /**
     * Due to Mixpanel HotSharding, we don't want to pass userId for production volume
     */
    const segmentUserId = ['test-workflow', 'digest-playground'].includes(
      command.payload.__source
    )
      ? userId
      : '';

    this.analyticsService.mixpanelTrack(
      'Notification event trigger - [Triggers]',
      segmentUserId,
      {
        name: template.name,
        type: template?.type || 'REGULAR',
        transactionId: command.transactionId,
        _template: template._id,
        _organization: command.organizationId,
        channels: template?.steps.map((step) => step.template?.type),
        source: command.payload.__source || 'api',
        subscriberSource: _subscriberSource || null,
        requestCategory: requestCategory || null,
      }
    );

    const subscriberProcessed = await this.processSubscriber.execute(
      ProcessSubscriberCommand.create({
        environmentId,
        organizationId,
        userId,
        subscriber,
      })
    );

    // If no subscriber makes no sense to try to create notification
    if (!subscriberProcessed) {
      /**
       * TODO: Potentially add a CreateExecutionDetails entry. Right now we
       * have the limitation we need a job to be created for that. Here there
       * is no job at this point.
       */
      Logger.warn(
        `Subscriber ${JSON.stringify(
          subscriber.subscriberId
        )} of organization ${command.organizationId} in transaction ${
          command.transactionId
        } was not processed. No jobs are created.`,
        LOG_CONTEXT
      );

      return;
    }

    const createNotificationJobsCommand: CreateNotificationJobsCommand = {
      environmentId,
      identifier,
      organizationId,
      overrides: command.overrides,
      payload: command.payload,
      subscriber: subscriberProcessed,
      template,
      templateProviderIds,
      to: subscriber,
      transactionId: command.transactionId,
      userId,
      tenant,
    };

    if (actor) {
      createNotificationJobsCommand.actor = actor;
    }

    const notificationJobs = await this.createNotificationJobs.execute(
      CreateNotificationJobsCommand.create(createNotificationJobsCommand)
    );

    await this.storeSubscriberJobs.execute(
      StoreSubscriberJobsCommand.create({
        environmentId: command.environmentId,
        jobs: notificationJobs,
        organizationId: command.organizationId,
      })
    );
  }

  @Instrument()
  private async getProviderId(
    environmentId: string,
    channelType: ChannelTypeEnum
  ): Promise<ProvidersIdEnum> {
    const integration = await this.integrationRepository.findOne(
      {
        _environmentId: environmentId,
        active: true,
        channel: channelType,
      },
      'providerId'
    );

    return integration?.providerId as ProvidersIdEnum;
  }

  @Instrument()
  private async validateSubscriberIdProperty(
    subscriber: ISubscribersDefine
  ): Promise<boolean> {
    const subscriberIdExists =
      typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;

    if (!subscriberIdExists) {
      throw new ApiException(
        'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
      );
    }

    return true;
  }

  @CachedEntity({
    builder: (command: { _id: string; environmentId: string }) =>
      buildNotificationTemplateKey({
        _environmentId: command.environmentId,
        _id: command._id,
      }),
  })
  private async getNotificationTemplate({
    _id,
    environmentId,
  }: {
    _id: string;
    environmentId: string;
  }) {
    return await this.notificationTemplateRepository.findById(
      _id,
      environmentId
    );
  }

  @InstrumentUsecase()
  private async getProviderIdsForTemplate(
    environmentId: string,
    template: NotificationTemplateEntity
  ): Promise<Record<ChannelTypeEnum, ProvidersIdEnum>> {
    const providers = {} as Record<ChannelTypeEnum, ProvidersIdEnum>;

    for (const step of template?.steps) {
      const type = step.template?.type;
      if (!type) continue;

      const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(type);

      if (providers[channelType] || !channelType) continue;

      if (channelType === ChannelTypeEnum.IN_APP) {
        providers[channelType] = InAppProviderIdEnum.Novu;
      } else {
        const provider = await this.getProviderId(environmentId, channelType);
        if (provider) {
          providers[channelType] = provider;
        }
      }
    }

    return providers;
  }
}
