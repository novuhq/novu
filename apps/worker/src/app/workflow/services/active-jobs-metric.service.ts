const nr = require('newrelic');

import {
  ActiveJobsMetricQueueService,
  ActiveJobsMetricWorkerService,
  MetricsService,
  QueueBaseService,
  WorkerOptions,
} from '@novu/application-generic';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { checkingForCronJob } from '../../shared/utils';

const LOG_CONTEXT = 'ActiveJobMetricService';
const METRIC_JOB_ID = 'metrics-job';

@Injectable()
export class ActiveJobsMetricService {
  constructor(
    @Inject('BULLMQ_LIST') private tokenList: QueueBaseService[],
    public readonly activeJobsMetricQueueService: ActiveJobsMetricQueueService,
    public readonly activeJobsMetricWorkerService: ActiveJobsMetricWorkerService,
    private metricsService: MetricsService
  ) {
    if (process.env.NOVU_MANAGED_SERVICE === 'true' && process.env.NEW_RELIC_LICENSE_KEY) {
      this.activeJobsMetricWorkerService.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());

      this.activeJobsMetricWorkerService.worker.on('completed', async (job) => {
        await checkingForCronJob(process.env.ACTIVE_CRON_ID);
        Logger.log({ jobId: job.id }, 'Metric Completed Job', LOG_CONTEXT);
      });

      this.activeJobsMetricWorkerService.worker.on('failed', async (job, error) => {
        Logger.error(error, 'Metric Completed Job failed', LOG_CONTEXT);
      });

      this.addToQueueIfMetricJobExists();
    }
  }

  private addToQueueIfMetricJobExists(): void {
    Promise.resolve(
      this.activeJobsMetricQueueService.queue.getRepeatableJobs().then((job): boolean => {
        let exists = false;
        for (const jobElement of job) {
          if (jobElement.id === METRIC_JOB_ID) {
            exists = true;
          }
        }

        return exists;
      })
    )
      .then(async (exists: boolean): Promise<void> => {
        Logger.log(`metric job exists: ${exists}`, LOG_CONTEXT);

        if (!exists) {
          Logger.log(`metricJob doesn't exist, creating it`, LOG_CONTEXT);

          return await this.activeJobsMetricQueueService.add({
            name: METRIC_JOB_ID,
            data: undefined,
            groupId: '',
            options: {
              jobId: METRIC_JOB_ID,
              repeatJobKey: METRIC_JOB_ID,
              repeat: {
                immediately: true,
                pattern: '* * * * * *',
              },
              removeOnFail: true,
              removeOnComplete: true,
              attempts: 1,
            },
          });
        }

        return undefined;
      })
      .catch((error) => {
        nr.noticeError(error);

        Logger.error('Metric Job Exists function errored', LOG_CONTEXT, error);
      });
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 900,
      concurrency: 1,
      settings: {},
    };
  }

  private getWorkerProcessor() {
    return async () => {
      return await new Promise<void>(async (resolve, reject): Promise<void> => {
        Logger.log('metric job started', LOG_CONTEXT);
        const deploymentName = process.env.FLEET_NAME ?? 'default';

        try {
          for (const queueService of this.tokenList) {
            const waitCount = queueService.getGroupsJobsCount
              ? await queueService.getGroupsJobsCount()
              : await queueService.getWaitingCount();
            const delayedCount = await queueService.getDelayedCount();
            const activeCount = await queueService.getActiveCount();

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

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Active Jobs Metric service down', LOG_CONTEXT);

    if (this.activeJobsMetricQueueService) {
      await this.activeJobsMetricQueueService.gracefulShutdown();
    }
    if (this.activeJobsMetricWorkerService) {
      await this.activeJobsMetricWorkerService.gracefulShutdown();
    }

    Logger.log('Shutting down the Active Jobs Metric service has finished', LOG_CONTEXT);
  }
}
