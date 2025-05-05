import { Injectable } from '@nestjs/common';
import _ from 'lodash';

import {
  IntegrationRepository,
  JobEntity,
  JobRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { SubscriberSourceEnum } from '@novu/shared';

import { InstrumentUsecase } from '../../instrumentation';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerBroadcastCommand } from './trigger-broadcast.command';
import { IProcessSubscriberBulkJobDto } from '../../dtos';

const LOG_CONTEXT = 'TriggerBroadcastUseCase';
const QUEUE_CHUNK_SIZE = Number(process.env.BROADCAST_QUEUE_CHUNK_SIZE) || 100;

@Injectable()
export class TriggerBroadcast {
  constructor(
    private integrationRepository: IntegrationRepository,
    private subscriberRepository: SubscriberRepository,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private subscriberProcessQueueService: SubscriberProcessQueueService
  ) {}

  @InstrumentUsecase()
  async execute(command: TriggerBroadcastCommand) {
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
          controls: command.controls,
          requestCategory: command.requestCategory,
          bridge: {
            url: command.bridgeUrl,
            workflow: command.bridgeWorkflow,
          },
          environmentName: command.environmentName,
        },
        groupId: command.organizationId,
      };
    });
  }

  private async subscriberProcessQueueAddBulk(jobs) {
    return await Promise.all(
      _.chunk(jobs, QUEUE_CHUNK_SIZE).map((chunk) => this.subscriberProcessQueueService.addBulk(chunk))
    );
  }
}
