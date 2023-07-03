import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  JobEntity,
  JobRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  IntegrationRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  InAppProviderIdEnum,
  ProvidersIdEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
} from '@novu/shared';

import { PinoLogger } from '../../logging';
import { Instrument, InstrumentUsecase } from '../../instrumentation';

import {
  AnalyticsService,
  buildNotificationTemplateIdentifierKey,
  CachedEntity,
  EventsPerformanceService,
} from '../../services';
import { TriggerEventCommand } from './trigger-event.command';
import {
  StoreSubscriberJobs,
  StoreSubscriberJobsCommand,
} from '../store-subscriber-jobs';
import {
  CreateNotificationJobsCommand,
  CreateNotificationJobs,
} from '../create-notification-jobs';
import {
  ProcessSubscriber,
  ProcessSubscriberCommand,
} from '../process-subscriber';
import { ApiException } from '../../utils/exceptions';
import {
  GetNovuIntegration,
  GetNovuIntegrationCommand,
} from '../get-novu-integration';

const LOG_CONTEXT = 'TriggerEventUseCase';

@Injectable()
export class TriggerEvent {
  constructor(
    private storeSubscriberJobs: StoreSubscriberJobs,
    private createNotificationJobs: CreateNotificationJobs,
    private processSubscriber: ProcessSubscriber,
    private integrationRepository: IntegrationRepository,
    private getNovuIntegration: GetNovuIntegration,
    protected performanceService: EventsPerformanceService,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private logger: PinoLogger,
    private analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  async execute(command: TriggerEventCommand) {
    const mark = this.performanceService.buildTriggerEventMark(
      command.identifier,
      command.transactionId
    );

    const { actor, environmentId, identifier, organizationId, to, userId } =
      command;

    await this.validateTransactionIdProperty(
      command.transactionId,
      environmentId
    );

    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: identifier,
      },
    });

    this.logger.assign({
      transactionId: command.transactionId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const template = await this.getNotificationTemplateByTriggerIdentifier({
      environmentId: command.environmentId,
      triggerIdentifier: command.identifier,
    });

    /*
     * Makes no sense to execute anything if template doesn't exist
     * TODO: Send a 404?
     */
    if (!template) {
      const message = 'Notification template could not be found';
      Logger.error(message, LOG_CONTEXT);
      throw new ApiException(message);
    }

    const templateProviderIds = await this.getProviderIdsForTemplate(
      command.userId,
      command.organizationId,
      command.environmentId,
      template
    );

    // We might have a single actor for every trigger, so we only need to check for it once
    let actorProcessed;
    if (actor) {
      actorProcessed = await this.processSubscriber.execute(
        ProcessSubscriberCommand.create({
          environmentId,
          organizationId,
          userId,
          subscriber: actor,
        })
      );
    }

    for (const subscriber of to) {
      this.analyticsService.track(
        'Notification event trigger - [Triggers]',
        command.userId,
        {
          _subscriber: subscriber._id,
          transactionId: command.transactionId,
          _template: template._id,
          _organization: command.organizationId,
          channels: template?.steps.map((step) => step.template?.type),
          source: command.payload.__source || 'api',
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
      if (subscriberProcessed) {
        const createNotificationJobsCommand =
          CreateNotificationJobsCommand.create({
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
            ...(actor && actorProcessed && { actor: actorProcessed }),
          });

        const notificationJobs = await this.createNotificationJobs.execute(
          createNotificationJobsCommand
        );

        const storeSubscriberJobsCommand = StoreSubscriberJobsCommand.create({
          environmentId: command.environmentId,
          jobs: notificationJobs,
          organizationId: command.organizationId,
        });
        await this.storeSubscriberJobs.execute(storeSubscriberJobsCommand);
      }
    }

    this.performanceService.setEnd(mark);
  }

  @CachedEntity({
    builder: (command: { triggerIdentifier: string; environmentId: string }) =>
      buildNotificationTemplateIdentifierKey({
        _environmentId: command.environmentId,
        templateIdentifier: command.triggerIdentifier,
      }),
  })
  private async getNotificationTemplateByTriggerIdentifier(command: {
    triggerIdentifier: string;
    environmentId: string;
  }) {
    return await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.triggerIdentifier
    );
  }

  @Instrument()
  private async validateTransactionIdProperty(
    transactionId: string,
    environmentId: string
  ): Promise<void> {
    const found = (await this.jobRepository.findOne(
      {
        transactionId,
        _environmentId: environmentId,
      },
      '_id'
    )) as Pick<JobEntity, '_id'>;

    if (found) {
      throw new ApiException(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId'
      );
    }
  }

  @InstrumentUsecase()
  private async getProviderIdsForTemplate(
    userId: string,
    organizationId: string,
    environmentId: string,
    template: NotificationTemplateEntity
  ): Promise<Record<ChannelTypeEnum, ProvidersIdEnum>> {
    const providers = {} as Record<ChannelTypeEnum, ProvidersIdEnum>;

    for (const step of template?.steps) {
      const type = step.template?.type;
      if (type) {
        const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(type);

        if (channelType) {
          if (providers[channelType]) continue;
          if (channelType === ChannelTypeEnum.IN_APP) {
            providers[channelType] = InAppProviderIdEnum.Novu;
          } else {
            const provider = await this.getProviderId(
              userId,
              organizationId,
              environmentId,
              channelType
            );
            if (provider) {
              providers[channelType] = provider;
            }
          }
        }
      }
    }

    return providers;
  }

  @Instrument()
  private async getProviderId(
    userId: string,
    organizationId: string,
    environmentId: string,
    channelType: ChannelTypeEnum
  ): Promise<ProvidersIdEnum> {
    let integration = await this.integrationRepository.findOne(
      {
        _environmentId: environmentId,
        active: true,
        channel: channelType,
      },
      'providerId'
    );

    if (!integration) {
      integration = await this.getNovuIntegration.execute(
        GetNovuIntegrationCommand.create({
          channelType: channelType,
          organizationId: organizationId,
          environmentId: environmentId,
          userId: userId,
        })
      );
    }

    return integration?.providerId as ProvidersIdEnum;
  }
}
