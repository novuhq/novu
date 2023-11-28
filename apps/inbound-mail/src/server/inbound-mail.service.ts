import { BullMqService, InboundParseQueueService, QueueBaseOptions } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

export class InboundMailService {
  public inboundParseQueueService: InboundParseQueueService;

  constructor() {
    this.inboundParseQueueService = new InboundParseQueueService();
  }
}
