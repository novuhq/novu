import { Injectable, Logger } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { JobTopicNameEnum } from '@novu/shared';
import { IStandardBulkJobDto, IStandardJobDto } from '../../dtos';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { EventBridgeSchedulerService } from '../scheduler';
import { SqsService } from '../sqs';
import { QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'StandardQueueService';

@Injectable()
export class StandardQueueService extends QueueBaseService {
  constructor(
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    sqsService: SqsService,
    featureFlagsService: FeatureFlagsService,
    organizationRepository: CommunityOrganizationRepository,
    logger: PinoLogger,
    schedulerService: EventBridgeSchedulerService
  ) {
    super(
      JobTopicNameEnum.STANDARD,
      new BullMqService(workflowInMemoryProviderService),
      sqsService,
      featureFlagsService,
      organizationRepository,
      logger,
      // Standard is the only topic that ever carries a delay.
      schedulerService
    );

    Logger.log({ topic: this.topic }, 'Creating queue', LOG_CONTEXT);

    this.createQueue();
    this.logger.setContext(LOG_CONTEXT);
  }

  public async add(data: IStandardJobDto) {
    /*
     * The job name is the Mongo job id, so defaulting the BullMQ job id to it makes a repeated
     * insertion of the same job a no-op while it is queued, delayed or active. BullMQ only - the
     * SQS route derives its own message id. Reusing an id later depends on the entry being dropped
     * once it settles: addToBullMQ defaults removeOnComplete and removeOnFail to true but lets
     * caller options override them, so a caller passing removeOnFail: false would leave a tombstone
     * that blocks every later insert of that job. Callers that deliberately need a second live
     * entry for one job (schedule extensions) pass an id of their own.
     */
    const jobData: IStandardJobDto = {
      ...data,
      options: { ...data.options, jobId: data.options?.jobId ?? data.name },
    };

    return await super.add(jobData);
  }

  public async addBulk(data: IStandardBulkJobDto[]) {
    return await super.addBulk(data);
  }
}
