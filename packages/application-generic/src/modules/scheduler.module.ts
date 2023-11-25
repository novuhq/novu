import { Module, Provider } from '@nestjs/common';
import { ActiveJobMetricScheduledWorkerService } from '../services/scheduled-worker';
import {
  ActiveJobMetricSchedulerService,
  SCHEDULER_PROVIDER_TOKEN,
  buildAgendaScheduler,
} from '../services/schedulers';

const PROVIDERS: Provider[] = [
  ActiveJobMetricScheduledWorkerService,
  ActiveJobMetricSchedulerService,
  {
    provide: SCHEDULER_PROVIDER_TOKEN,
    useFactory: async () => {
      return await buildAgendaScheduler();
    },
    inject: [],
  },
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class SchedulerModule {}
