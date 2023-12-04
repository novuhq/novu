import {
  BullMqService,
  InboundParseQueueService,
  QueueBaseOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

export class InboundMailService {
  public inboundParseQueueService: InboundParseQueueService;
  private workflowInMemoryProviderService: WorkflowInMemoryProviderService;
  constructor() {
    this.workflowInMemoryProviderService = new WorkflowInMemoryProviderService();
    this.inboundParseQueueService = new InboundParseQueueService(this.workflowInMemoryProviderService);
  }

  async start() {
    await this.workflowInMemoryProviderService.initialize();
  }
}
