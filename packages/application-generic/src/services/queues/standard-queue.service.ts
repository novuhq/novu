import { Inject, Injectable, Logger } from '@nestjs/common';
import { IJobData, JobTopicNameEnum } from '@novu/shared';

import { IJobParams, QueueBaseService } from './queue-base.service';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

const LOG_CONTEXT = 'StandardQueueService';

@Injectable()
export class StandardQueueService extends QueueBaseService {
  constructor(
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(
      JobTopicNameEnum.STANDARD,
      new BullMqService(workflowInMemoryProviderService)
    );

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }

  public async addMinimalJob(params: IJobParams) {
    const { name, groupId, data, options } = params;

    const jobData: IJobData = data
      ? {
          _environmentId: data._environmentId,
          _id: data._id,
          _organizationId: data._organizationId,
          _userId: data._userId,
        }
      : undefined;

    await super.add({ name, data: jobData, options, groupId });
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
