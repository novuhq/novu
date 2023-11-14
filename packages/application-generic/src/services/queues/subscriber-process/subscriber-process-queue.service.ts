import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { QueueBaseService } from '../queue-base.service';
import {
  IProcessSubscriberBulkJobDto,
  IProcessSubscriberJobDto,
} from '../../../dtos/process-subscriber-job.dto';

@Injectable()
export class SubscriberProcessQueueService extends QueueBaseService {
  private readonly LOG_CONTEXT = 'SubscriberProcessQueueService';
  constructor() {
    super(JobTopicNameEnum.PROCESS_SUBSCRIBER);

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
