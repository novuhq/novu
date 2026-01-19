import { Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SqsService } from '../sqs';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'ActiveJobsMetricWorkerService';

@Injectable()
export class ActiveJobsMetricWorkerService extends WorkerBaseService {
  constructor(workflowInMemoryProvider: WorkflowInMemoryProviderService, sqsService?: SqsService, logger?: PinoLogger) {
    super(JobTopicNameEnum.ACTIVE_JOBS_METRIC, new BullMqService(workflowInMemoryProvider), sqsService, logger);
  }
}
