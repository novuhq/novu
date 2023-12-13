import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';

import {
  IntegrationRepository,
  JobEntity,
  JobRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ISubscribersDefine,
  ISubscribersSource,
  ProvidersIdEnum,
} from '@novu/shared';

import { ProcessSubscriber } from '../process-subscriber';
import { PinoLogger } from '../../logging';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import {
  buildNotificationTemplateIdentifierKey,
  CachedEntity,
} from '../../services/cache';
import { ApiException } from '../../utils/exceptions';
import { ProcessTenant } from '../process-tenant';
import { MapTriggerRecipients } from '../map-trigger-recipients/map-trigger-recipients.use-case';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerMulticastCommand } from './trigger-multicast.command';
import { MapTriggerRecipientsCommand } from '../map-trigger-recipients';

const LOG_CONTEXT = 'TriggerMulticastUseCase';
const QUEUE_CHUNK_SIZE = 100;

@Injectable()
export class TriggerMulticast {
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
  async execute(command: TriggerMulticastCommand) {
    {
      const mappedRecipients = await this.mapTriggerRecipients.execute(
        MapTriggerRecipientsCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          recipients: command.to,
          transactionId: command.transactionId,
          userId: command.userId,
          actor: command.actor,
        })
      );

      await this.validateSubscriberIdProperty(mappedRecipients);

      const jobs = this.mapSubscribersToJobs(mappedRecipients, command);

      await this.subscriberProcessQueueAddBulk(jobs);
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
  private async validateSubscriberIdProperty(
    to: ISubscribersSource[]
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

  private mapSubscribersToJobs(
    subscribers: ISubscribersSource[],
    command: TriggerMulticastCommand
  ) {
    return subscribers.map((subscriber) => {
      const { _subscriberSource, ...subscribersDefineParams } = subscriber;
      const subscribersDefine: ISubscribersDefine = subscribersDefineParams;

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
          ...(command.actor && { actor: command.actor }),
          subscriber: subscribersDefine,
          templateId: command.template._id,
          _subscriberSource: _subscriberSource,
        },
        groupId: command.organizationId,
      };
    });
  }

  private async subscriberProcessQueueAddBulk(jobs) {
    return await Promise.all(
      _.chunk(jobs, QUEUE_CHUNK_SIZE).map((chunk) =>
        this.subscriberProcessQueueService.addBulk(chunk)
      )
    );
  }
}
