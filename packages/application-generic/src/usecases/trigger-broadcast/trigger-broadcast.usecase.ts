import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';

import {
  IntegrationRepository,
  JobEntity,
  JobRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ProvidersIdEnum,
  SubscriberSourceEnum,
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
import { TriggerBroadcastCommand } from './trigger-broadcast.command';
import { IProcessSubscriberBulkJobDto } from '../../dtos';

const LOG_CONTEXT = 'TriggerBroadcastUseCase';
const QUEUE_CHUNK_SIZE = Number(process.env.BROADCAST_QUEUE_CHUNK_SIZE) || 100;

@Injectable()
export class TriggerBroadcast {
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
  async execute(command: TriggerBroadcastCommand) {
    {
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
          await this.sendToProcessSubscriberService(command, subscribers);
          subscribers = [];
        }
      }

      if (subscribers.length > 0) {
        await this.sendToProcessSubscriberService(command, subscribers);
      }
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

  private async sendToProcessSubscriberService(
    command: TriggerBroadcastCommand,
    subscribers: { subscriberId: string }[]
  ) {
    const jobs = this.mapSubscribersToJobs(subscribers, command);

    return await this.subscriberProcessQueueAddBulk(jobs);
  }

  private mapSubscribersToJobs(
    subscribers: { subscriberId: string }[],
    command: TriggerBroadcastCommand
  ): IProcessSubscriberBulkJobDto[] {
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
          ...(command.actor && { actor: command.actor }),
          subscriber,
          templateId: command.template._id,
          _subscriberSource: SubscriberSourceEnum.BROADCAST,
          requestCategory: command.requestCategory,
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
