import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import * as _ from 'lodash';

import {
  IntegrationRepository,
  JobEntity,
  JobRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  AddressingTypeEnum,
  ChannelTypeEnum,
  ISubscribersDefine,
  ITenantDefine,
  ProvidersIdEnum,
  TriggerTenantContext,
} from '@novu/shared';

import {
  TriggerEventBroadcastCommand,
  TriggerEventCommand,
  TriggerEventMulticastCommand,
} from './trigger-event.command';
import {
  ProcessSubscriber,
  ProcessSubscriberCommand,
} from '../process-subscriber';
import { PinoLogger } from '../../logging';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import {
  buildNotificationTemplateIdentifierKey,
  CachedEntity,
} from '../../services/cache';
import { ApiException } from '../../utils/exceptions';
import { ProcessTenant, ProcessTenantCommand } from '../process-tenant';
import { MapTriggerRecipients } from '../map-trigger-recipients/map-trigger-recipients.use-case';
import { MapTriggerRecipientsCommand } from '../map-trigger-recipients/map-trigger-recipients.command';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';

const LOG_CONTEXT = 'TriggerEventUseCase';
const QUEUE_CHUNK_SIZE = 100;

@Injectable()
export class TriggerEvent {
  constructor(
    private processSubscriber: ProcessSubscriber,
    private integrationRepository: IntegrationRepository,
    private subscriberRepository: SubscriberRepository,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private processTenant: ProcessTenant,
    private logger: PinoLogger,
    private mapTriggerRecipients: MapTriggerRecipients,
    private subscriberProcessQueueService: SubscriberProcessQueueService
  ) {}

  @InstrumentUsecase()
  async execute(command: TriggerEventCommand) {
    try {
      const mappedCommand = {
        ...command,
        tenant: this.mapTenant(command.tenant),
        actor: this.mapTriggerRecipients.mapSubscriber(command.actor),
      };

      Logger.debug(mappedCommand.actor);

      const { environmentId, identifier, organizationId, userId } =
        mappedCommand;

      await this.validateTransactionIdProperty(
        mappedCommand.transactionId,
        environmentId
      );

      Sentry.addBreadcrumb({
        message: 'Sending trigger',
        data: {
          triggerIdentifier: identifier,
        },
      });

      this.logger.assign({
        transactionId: mappedCommand.transactionId,
        environmentId: mappedCommand.environmentId,
        organizationId: mappedCommand.organizationId,
      });

      const template = await this.getNotificationTemplateByTriggerIdentifier({
        environmentId: mappedCommand.environmentId,
        triggerIdentifier: mappedCommand.identifier,
      });

      /*
       * Makes no sense to execute anything if template doesn't exist
       * TODO: Send a 404?
       */
      if (!template) {
        throw new ApiException('Notification template could not be found');
      }

      if (mappedCommand.tenant) {
        const tenantProcessed = await this.processTenant.execute(
          ProcessTenantCommand.create({
            environmentId,
            organizationId,
            userId,
            tenant: mappedCommand.tenant,
          })
        );

        if (!tenantProcessed) {
          Logger.warn(
            `Tenant with identifier ${JSON.stringify(
              mappedCommand.tenant.identifier
            )} of organization ${mappedCommand.organizationId} in transaction ${
              mappedCommand.transactionId
            } could not be processed.`,
            LOG_CONTEXT
          );
        }
      }

      // We might have a single actor for every trigger, so we only need to check for it once
      let actorProcessed: SubscriberEntity | undefined;
      if (mappedCommand.actor) {
        actorProcessed = await this.processSubscriber.execute(
          ProcessSubscriberCommand.create({
            environmentId,
            organizationId,
            userId,
            subscriber: mappedCommand.actor,
          })
        );
      }

      if (
        (mappedCommand as TriggerEventBroadcastCommand).addressingType ===
        AddressingTypeEnum.BROADCAST
      ) {
        const broadcastCommand = mappedCommand as TriggerEventBroadcastCommand;
        await this.triggerBroadcast(broadcastCommand, actorProcessed, template);

        return;
      }

      const multicastCommand = mappedCommand as TriggerEventMulticastCommand;
      await this.triggerMulticast(multicastCommand, actorProcessed, template);
    } catch (e) {
      Logger.error(
        {
          transactionId: command.transactionId,
          organization: command.organizationId,
          triggerIdentifier: command.identifier,
          userId: command.userId,
          error: e,
        },
        'Unexpected error has occurred when triggering event',
        LOG_CONTEXT
      );

      throw e;
    }
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

  @Instrument()
  private async validateSubscriberIdProperty(
    to: ISubscribersDefine[]
  ): Promise<boolean> {
    for (const subscriber of to) {
      const subscriberIdExists =
        typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;

      if (Array.isArray(subscriberIdExists)) {
        throw new ApiException(
          'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings'
        );
      }

      if (!subscriberIdExists) {
        throw new ApiException(
          'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
        );
      }
    }

    return true;
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

  private async triggerBroadcast(
    command: TriggerEventBroadcastCommand,
    actorProcessed: SubscriberEntity,
    template: NotificationTemplateEntity
  ) {
    const subscriberFetchBatchSize = 500;
    let subscribers: SubscriberEntity[] = [];

    for await (const subscriber of this.subscriberRepository.findBatch(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      'subscriberId',
      {},
      subscriberFetchBatchSize
    )) {
      subscribers.push(subscriber);
      if (subscribers.length === subscriberFetchBatchSize) {
        await this.sendToProcessSubscriberService(
          command,
          actorProcessed,
          template,
          subscribers
        );
        subscribers = [];
      }
    }

    if (subscribers.length > 0) {
      await this.sendToProcessSubscriberService(
        command,
        actorProcessed,
        template,
        subscribers
      );
    }
  }

  private async triggerMulticast(
    command: TriggerEventMulticastCommand,
    actorProcessed: SubscriberEntity,
    template: NotificationTemplateEntity
  ) {
    const mappedRecipients = await this.mapTriggerRecipients.execute(
      MapTriggerRecipientsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        recipients: command.to,
        transactionId: command.transactionId,
        userId: command.userId,
        actor: actorProcessed,
      })
    );

    await this.validateSubscriberIdProperty(mappedRecipients);

    const jobs = this.mapSubscribersToJobs(
      mappedRecipients,
      command,
      actorProcessed,
      template
    );

    await this.subscriberProcessQueueAddBulk(jobs);
  }

  private async sendToProcessSubscriberService(
    command: TriggerEventBroadcastCommand,
    actorProcessed: SubscriberEntity,
    template: NotificationTemplateEntity,
    subscribers: { subscriberId: string }[]
  ) {
    const jobs = this.mapSubscribersToJobs(
      subscribers,
      command,
      actorProcessed,
      template
    );

    return await this.subscriberProcessQueueAddBulk(jobs);
  }

  private mapSubscribersToJobs(
    subscribers: { subscriberId: string }[],
    command: TriggerEventCommand,
    actorProcessed,
    template
  ) {
    return subscribers.map((subscriber) => {
      return {
        name: command.transactionId + subscriber.subscriberId,
        data: {
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          transactionId: command.transactionId,
          identifier: command.identifier,
          payload: command.payload,
          overrides: command.overrides,
          tenant: command.tenant,
          ...(actorProcessed && { actor: actorProcessed }),
          subscriber,
          templateId: template._id,
        },
        groupId: command.organizationId,
      };
    });
  }

  private mapTenant(tenant: TriggerTenantContext): ITenantDefine | null {
    if (!tenant) return null;

    if (typeof tenant === 'string') {
      return { identifier: tenant };
    }

    return tenant;
  }

  private async subscriberProcessQueueAddBulk(jobs) {
    return await Promise.all(
      _.chunk(jobs, QUEUE_CHUNK_SIZE).map((chunk) =>
        this.subscriberProcessQueueService.addBulk(chunk)
      )
    );
  }
}
