import { Injectable } from '@nestjs/common';

import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { SubscriberSourceEnum } from '@novu/shared';

import { PinoLogger } from 'nestjs-pino';
import { InstrumentUsecase } from '../../instrumentation';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerBase } from '../trigger-base';
import { TriggerBroadcastCommand } from './trigger-broadcast.command';
import { CacheService, FeatureFlagsService } from '../../services';

const QUEUE_CHUNK_SIZE = Number(process.env.BROADCAST_QUEUE_CHUNK_SIZE) || 100;

@Injectable()
export class TriggerBroadcast extends TriggerBase {
  constructor(
    private subscriberRepository: SubscriberRepository,
    protected subscriberProcessQueueService: SubscriberProcessQueueService,
    protected cacheService: CacheService,
    protected featureFlagsService: FeatureFlagsService,
    protected logger: PinoLogger
  ) {
    super(subscriberProcessQueueService, cacheService, featureFlagsService, logger, QUEUE_CHUNK_SIZE);
    this.logger.setContext(this.constructor.name);
  }

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
        await this.sendToProcessSubscriberService(command, subscribers, SubscriberSourceEnum.BROADCAST);
        subscribers = [];
      }
    }

    if (subscribers.length > 0) {
      await this.sendToProcessSubscriberService(command, subscribers, SubscriberSourceEnum.BROADCAST);
    }
  }
}
