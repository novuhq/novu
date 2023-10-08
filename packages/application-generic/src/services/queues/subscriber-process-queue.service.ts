import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { QueueBaseService } from './queue-base.service';

@Injectable()
export class SubscriberProcessQueueService extends QueueBaseService {
  private readonly LOG_CONTEXT = 'SubscriberProcessQueueService';
  constructor() {
    super(JobTopicNameEnum.PROCESS_SUBSCRIBER);

    Logger.log(`Creating queue ${this.topic}`, this.LOG_CONTEXT);

    this.createQueue();
  }
}
