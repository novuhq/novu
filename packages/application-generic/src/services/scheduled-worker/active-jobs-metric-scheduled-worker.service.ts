import { SchedulerTopicNameEnum } from '@novu/shared';
import { Inject, Injectable } from '@nestjs/common';

import { SCHEDULER_PROVIDER_TOKEN } from '../schedulers';
import { ScheduledWorkerBaseService } from './scheduled-worker-base.service';
import { Scheduler } from '../schedulers/providers/types';

@Injectable()
export class ActiveJobMetricScheduledWorkerService extends ScheduledWorkerBaseService {
  constructor(@Inject(SCHEDULER_PROVIDER_TOKEN) protected instance: Scheduler) {
    super(SchedulerTopicNameEnum.ACTIVE_JOB_METRICS, instance);
  }
}
