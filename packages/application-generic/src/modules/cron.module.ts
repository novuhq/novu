import { DynamicModule, Module, Provider } from '@nestjs/common';
import { JobCronNameEnum, JobTopicNameEnum } from '@novu/shared';
import {
  ACTIVE_CRON_JOBS_TOKEN,
  AgendaCronService,
  CronService,
  MetricsService,
} from '../services';
import { MetricsModule } from './metrics.module';

/**
 * This map is a little uncomfortable because it depends on the Job topic name, coupling the Cron jobs to the
 * queue names that are injected via the environment variable `ACTIVE_WORKERS`.
 *
 * Moving forward, we should consider specifying an enum for Workers to decouple the Worker names from
 * the job names. This would allow us to specify the cron jobs in a more explicit way.
 */
const cronJobsFromWorkers: Partial<
  Record<JobTopicNameEnum, Array<JobCronNameEnum>>
> = {
  [JobTopicNameEnum.CRON]: [
    JobCronNameEnum.CREATE_BILLING_USAGE_RECORDS,
    JobCronNameEnum.SEND_CRON_METRICS,
  ],
};

export const cronService = {
  provide: CronService,
  useFactory: async (
    metricsService: MetricsService,
    activeCronJobs: JobCronNameEnum[]
  ) => {
    const service = new AgendaCronService(metricsService, activeCronJobs);

    return service;
  },
  inject: [MetricsService, ACTIVE_CRON_JOBS_TOKEN],
};

const PROVIDERS: Provider[] = [cronService, AgendaCronService];

@Module({
  imports: [MetricsModule],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class CronModule {
  static forRoot(activeWorkers: JobTopicNameEnum[]): DynamicModule {
    return {
      module: CronModule,
      providers: [
        {
          provide: ACTIVE_CRON_JOBS_TOKEN,
          useFactory: async () => {
            const activeJobs: JobCronNameEnum[] = activeWorkers.reduce(
              (acc, worker) => {
                if (cronJobsFromWorkers[worker]) {
                  return [...acc, ...cronJobsFromWorkers[worker]];
                }

                return acc;
              },
              [] as JobCronNameEnum[]
            );

            const uniqueActiveJobs = [...new Set(activeJobs)];

            return uniqueActiveJobs;
          },
        },
      ],
      exports: [cronService],
    };
  }
}
