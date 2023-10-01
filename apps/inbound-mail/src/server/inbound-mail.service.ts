import { BullMqService, InboundParseQueue, QueueBaseOptions } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

export class InboundMailService {
  private inboundParseQueue: InboundParseQueue;

  constructor() {
    this.inboundParseQueue = new InboundParseQueue();
  }

  public get inboundParseQueueService() {
    return this.inboundParseQueue;
  }
}
