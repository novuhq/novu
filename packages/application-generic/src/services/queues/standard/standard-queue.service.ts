import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { QueueBaseService } from '../queue-base.service';
import { IStandardJobDto } from '../../../dtos/standard-job.dto';

const LOG_CONTEXT = 'StandardQueueService';

@Injectable()
export class StandardQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.STANDARD);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }

  public async addMinimalJob(data: IStandardJobDto) {
    return await super.addMinimalJob(data);
  }

  public async add(data: unknown) {
    // in order to implement we need to know what should be the data dto first
    throw new Error('Not implemented');
  }

  public async addBulk(data: unknown[]) {
    // in order to implement we need to know what should be the data dto first
    throw new Error('Not implemented');
  }
}
