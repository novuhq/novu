import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { IInboundParseBulkJobDto, IInboundParseJobDto } from '../../dtos/inbound-parse-job.dto';

import { BullMqService, QueueOptions } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'InboundParseQueueService';

@Injectable()
export class InboundParseQueueService extends QueueBaseService {
  constructor(public workflowInMemoryProviderService: WorkflowInMemoryProviderService) {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL, new BullMqService(workflowInMemoryProviderService));

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue(this.getOverrideOptions());
  }

  public async add(data: IInboundParseJobDto) {
    return await super.add(data);
  }

  public async addBulk(data: IInboundParseBulkJobDto[]) {
    return await super.addBulk(data);
  }

  private getOverrideOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          delay: 4000,
          type: 'exponential',
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    };
  }
}
