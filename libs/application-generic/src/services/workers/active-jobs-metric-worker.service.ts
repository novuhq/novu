import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

const LOG_CONTEXT = 'ActiveJobsMetricWorkerService';

@Injectable()
export class ActiveJobsMetricWorkerService extends WorkerBaseService {
  constructor(
    private workflowInMemoryProvider: WorkflowInMemoryProviderService
  ) {
    super(
      JobTopicNameEnum.ACTIVE_JOBS_METRIC,
      new BullMqService(workflowInMemoryProvider)
    );
  }
}
