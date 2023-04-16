import { Injectable } from '@nestjs/common';
import { QueueService } from '@novu/application-generic';

interface IJobData {
  _id: string;
  _environmentId: string;
  _organizationId: string;
  _userId: string;
}

@Injectable()
export class WorkflowQueueProducerService extends QueueService<IJobData> {}
