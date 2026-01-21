import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { IProcessSubscriberBulkJobDto, IProcessSubscriberJobDto } from '../../dtos/process-subscriber-job.dto';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SqsService } from '../sqs';
import { QueueBaseService } from './queue-base.service';

@Injectable()
export class SubscriberProcessQueueService extends QueueBaseService {
  private readonly LOG_CONTEXT = 'SubscriberProcessQueueService';
  constructor(
    @Inject(forwardRef(() => WorkflowInMemoryProviderService))
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    sqsService: SqsService,
    featureFlagsService: FeatureFlagsService,
    logger: PinoLogger
  ) {
    super(
      JobTopicNameEnum.PROCESS_SUBSCRIBER,
      new BullMqService(workflowInMemoryProviderService),
      sqsService,
      featureFlagsService,
      logger
    );

    Logger.log(`Creating queue ${this.topic}`, this.LOG_CONTEXT);

    this.createQueue();
  }

  public async add(data: IProcessSubscriberJobDto) {
    return await super.add(data);
  }

  public async addBulk(data: IProcessSubscriberBulkJobDto[]) {
    return await super.addBulk(data);
  }
}
