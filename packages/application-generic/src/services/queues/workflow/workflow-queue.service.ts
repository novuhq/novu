import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { QueueBaseService } from '../queue-base.service';
import { IWorkflowJobDto } from '../../../dtos';
import { IWorkflowBulkJobDto } from '../../../dtos/workflow-job.dto';

const LOG_CONTEXT = 'WorkflowQueueService';

@Injectable()
export class WorkflowQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.WORKFLOW);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }

  public async add(data: IWorkflowJobDto) {
    return await super.add(data);
  }

  public async addBulk(data: IWorkflowBulkJobDto[]) {
    return await super.addBulk(data);
  }
}
