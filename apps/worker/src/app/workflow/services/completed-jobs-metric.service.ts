import {
  CompletedJobsMetricQueueService,
  CompletedJobsMetricWorkerService,
  QueueBaseService,
  WorkerOptions,
} from '@novu/application-generic';
import * as process from 'process';
import { JobTopicNameEnum } from '@novu/shared';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { checkingForCronJob } from '../../shared/utils';

const LOG_CONTEXT = 'CompletedJobMetricService';
const METRIC_JOB_ID = 'metric-job';

@Injectable()
export class CompletedJobsMetricService {
  public readonly completedJobsMetricQueueService: CompletedJobsMetricQueueService;
  public readonly completedJobsMetricWorkerService: CompletedJobsMetricWorkerService;

  constructor(@Inject('BULLMQ_LIST') private tokenList: QueueBaseService[]) {
    if (process.env.NOVU_MANAGED_SERVICE === 'true' && process.env.NEW_RELIC_LICENSE_KEY) {
      this.completedJobsMetricQueueService = new CompletedJobsMetricQueueService();
      this.completedJobsMetricWorkerService = new CompletedJobsMetricWorkerService();

      this.completedJobsMetricQueueService.createQueue();
      this.completedJobsMetricWorkerService.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());

      this.completedJobsMetricWorkerService.worker.on('completed', async (job) => {
        await checkingForCronJob(process.env.COMPLETED_CRON_ID);
        Logger.verbose('Metric Completed Job', job.id, LOG_CONTEXT);
      });

      this.completedJobsMetricWorkerService.worker.on('failed', async (job, error) => {
        Logger.verbose('Metric Completed Job failed', LOG_CONTEXT, error);
      });

      this.addToQueueIfMetricJobExists();
    }
  }

  private addToQueueIfMetricJobExists(): void {
    Promise.resolve(
      this.completedJobsMetricQueueService.queue.getRepeatableJobs().then((job): boolean => {
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
        Logger.debug(`metric job exists: ${exists}`, LOG_CONTEXT);

        if (!exists) {
          Logger.debug(`metricJob doesn't exist, creating it`, LOG_CONTEXT);

          return await this.completedJobsMetricQueueService.add(METRIC_JOB_ID, undefined, '', {
            jobId: METRIC_JOB_ID,
            repeatJobKey: METRIC_JOB_ID,
            repeat: {
              immediately: true,
              pattern: '0 * * * * *',
            },
            removeOnFail: true,
            removeOnComplete: true,
            attempts: 1,
          });
        }

        return undefined;
      })
      .catch((error) => Logger.error('Metric Job Exists function errored', LOG_CONTEXT, error));
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
        Logger.verbose('metric job started', LOG_CONTEXT);
        const deploymentName = process.env.FLEET_NAME ?? 'default';

        try {
          for (const queueService of this.tokenList) {
            const metrics = await queueService.bullMqService.getQueueMetrics(0, 1);
            const completeNumber = metrics.completed.count;
            const failNumber = metrics.failed.count;

            Logger.verbose('active length', process.env.NEW_RELIC_LICENSE_KEY.length);
            Logger.verbose('Recording active, waiting, and delayed metrics');

            const nr = require('newrelic');
            nr.recordMetric(`Queue/${deploymentName}/${queueService.topic}/completed`, completeNumber);
            nr.recordMetric(`Queue/${deploymentName}/${queueService.topic}/failed`, failNumber);

            Logger.verbose(`Queue/${deploymentName}/${queueService.topic}/completed`, completeNumber);
            Logger.verbose(`Queue/${deploymentName}/${queueService.topic}/failed`, failNumber);
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
    Logger.log('Shutting the Completed Jobs Metric service down', LOG_CONTEXT);

    await this.completedJobsMetricQueueService.gracefulShutdown();
    await this.completedJobsMetricWorkerService.gracefulShutdown();

    Logger.log('Shutting down the Completed Jobs Metric service has finished', LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
