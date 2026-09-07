import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DalService } from '@novu/dal';
import { JobCronNameEnum, JobTopicNameEnum } from '@novu/shared';
import { Pulse } from '@pulsecron/pulse';
import os from 'os';
import { dalService as customDalService } from '../custom-providers';
import { ACTIVE_CRON_JOBS_TOKEN, CronService, MetricsService, PulseCronService } from '../services';
import { MetricsModule } from './metrics.module';

/**
 * This map is a little uncomfortable because it depends on the Job topic name, coupling the Cron jobs to the
 * queue names that are injected via the environment variable `ACTIVE_WORKERS`.
 *
 * Moving forward, we should consider specifying an enum for Workers to decouple the Worker names from
 * the job names. This would allow us to specify the cron jobs in a more explicit way for each worker.
 */
const cronJobsFromWorkers: Partial<Record<JobTopicNameEnum, Array<JobCronNameEnum>>> = {
  [JobTopicNameEnum.STANDARD]: [
    JobCronNameEnum.CREATE_BILLING_USAGE_RECORDS,
    JobCronNameEnum.SEND_CRON_METRICS,
    JobCronNameEnum.SEND_USAGE_REPORT,
  ],
};

export const cronService = {
  provide: CronService,
  useFactory: async (metricsService: MetricsService, activeCronJobs: JobCronNameEnum[], dalService: DalService) => {
    const pulse = new Pulse({
      mongo: dalService.connection.getClient().db() as any,
      /**
       * Sets the hostname for the Job. Used to debug last host to run the job via
       * the collection's `lastModifiedBy` attribute.
       *
       * @see https://github.com/pulsecron/pulse#name
       */
      name: `${os.hostname}-${process.pid}`,
      resumeOnRestart: false,
    });
    const service = new PulseCronService(metricsService, activeCronJobs, pulse);

    return service;
  },
  inject: [MetricsService, ACTIVE_CRON_JOBS_TOKEN, DalService],
};

const PROVIDERS: Provider[] = [cronService, MetricsService, customDalService];

@Module({})
export class CronModule {
  static forRoot(activeWorkers?: JobTopicNameEnum[]): DynamicModule {
    return {
      imports: [MetricsModule],
      module: CronModule,
      providers: [
        {
          provide: ACTIVE_CRON_JOBS_TOKEN,
          useFactory: async () => {
            const activeJobs: JobCronNameEnum[] = activeWorkers.reduce((acc, worker) => {
              if (cronJobsFromWorkers[worker]) {
                return [...acc, ...cronJobsFromWorkers[worker]];
              }

              return acc;
            }, [] as JobCronNameEnum[]);

            const uniqueActiveJobs = [...new Set(activeJobs)];

            return uniqueActiveJobs;
          },
        },
        ...PROVIDERS,
      ],
      exports: [...PROVIDERS],
    };
  }
}
