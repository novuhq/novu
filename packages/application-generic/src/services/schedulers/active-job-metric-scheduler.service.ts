import { SchedulerTopicNameEnum } from '@novu/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SchedulerBaseService } from './scheduler-base.service';
import { SCHEDULER_PROVIDER_TOKEN } from './constant';
import { Scheduler } from './providers/types';

@Injectable()
export class ActiveJobMetricSchedulerService extends SchedulerBaseService {
  constructor(@Inject(SCHEDULER_PROVIDER_TOKEN) protected instance: Scheduler) {
    super(SchedulerTopicNameEnum.ACTIVE_JOB_METRICS, instance);
  }
}
