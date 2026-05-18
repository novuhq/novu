import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { IManagedAgentJobDto } from '../../dtos/managed-agent-job.dto';
import { BullMqService, QueueOptions } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'ManagedAgentQueueService';

@Injectable()
export class ManagedAgentQueueService extends QueueBaseService {
  constructor(public workflowInMemoryProviderService: WorkflowInMemoryProviderService) {
    super(JobTopicNameEnum.MANAGED_AGENT, new BullMqService(workflowInMemoryProviderService));

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue(this.getOverrideOptions());
  }

  public async add(data: IManagedAgentJobDto) {
    return await super.add(data);
  }

  private getOverrideOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        attempts: 2,
        backoff: { delay: 5000, type: 'exponential' },
        removeOnComplete: true,
        removeOnFail: true,
      },
    };
  }
}
