import {
  MetricsService,
  QueueBaseService,
  ActiveJobMetricSchedulerService,
  ActiveJobMetricScheduledWorkerService,
} from '@novu/application-generic';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { checkingForCronJob } from '../../shared/utils';

const LOG_CONTEXT = 'ActiveJobMetricService';

@Injectable()
export class ActiveJobsMetricService {
  constructor(
    @Inject('BULLMQ_LIST') private tokenList: QueueBaseService[],
    private metricsService: MetricsService,
    private scheduler: ActiveJobMetricSchedulerService,
    private worker: ActiveJobMetricScheduledWorkerService
  ) {
    if (process.env.NOVU_MANAGED_SERVICE === 'true' && process.env.NEW_RELIC_LICENSE_KEY) {
      const workerProcessor = this.getWorkerProcessor();
      this.worker.initWorker(async (job) => {
        try {
          await workerProcessor();
          await checkingForCronJob(process.env.ACTIVE_CRON_ID);
          Logger.verbose({ jobId: job.attrs._id }, 'Active Job Metric Recorded', LOG_CONTEXT);
        } catch (err) {
          Logger.verbose('Active Job Metric failed', LOG_CONTEXT, err);
        }
      });
      this.scheduler.every('1 minute');
    }
  }

  private getWorkerProcessor() {
    return async () => {
      return await new Promise<void>(async (resolve, reject): Promise<void> => {
        Logger.verbose('metric job started', LOG_CONTEXT);
        const deploymentName = process.env.FLEET_NAME ?? 'default';

        try {
          for (const queueService of this.tokenList) {
            const waitCount = (queueService.instance.queue as any).getGroupsJobsCount
              ? await (queueService.instance.queue as any).getGroupsJobsCount()
              : await queueService.instance.queue.getWaitingCount();
            const delayedCount = await queueService.instance.queue.getDelayedCount();
            const activeCount = await queueService.instance.queue.getActiveCount();

            Logger.verbose('Recording active, waiting, and delayed metrics');

            this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/waiting`, waitCount);
            this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/delayed`, delayedCount);
            this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/active`, activeCount);
          }

          return resolve();
        } catch (error) {
          Logger.error({ error }, 'Error occurred while processing metrics', LOG_CONTEXT);

          return reject(error);
        }
      });
    };
  }
}
