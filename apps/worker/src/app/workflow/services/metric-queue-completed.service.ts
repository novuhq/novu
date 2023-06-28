import { WorkerOptions } from 'bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@novu/application-generic';
import { checkinForCronJob } from '../../shared/utils/cron-health';
import process from 'process';

const LOG_CONTEXT = 'MetricQueueService';
const METRIC_JOB_ID = 'metric-job';

@Injectable()
export class MetricQueueCompletedService extends QueueService<Record<string, never>> {
  constructor(@Inject('BULLMQ_LIST') private token_list: QueueService[]) {
    super('metric-completed');

    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());

    this.bullMqService.worker.on('completed', async (job) => {
      await checkinForCronJob(process.env.COMPLETE_CRON_ID);
      Logger.verbose(`metric job succeeded`);
    });

    this.bullMqService.worker.on('failed', async (job, error) => {
      Logger.error(`job failed to start: ${error}`, job);
    });

    this.addToQueueIfMetricJobExists();
  }

  private addToQueueIfMetricJobExists(): void {
    Promise.resolve(
      this.bullMqService.queue.getRepeatableJobs().then((job): boolean => {
        let exists = false;
        for (const jobElement of job) {
          if (jobElement.id === METRIC_JOB_ID) {
            exists = true;
          }
        }

        return exists;
      })
    )
      .then(async (exists): Promise<void> => {
        Logger.debug('metric job exists: ' + exists, LOG_CONTEXT);

        if (!exists) {
          Logger.debug(`metricJob doesn't exist, creating it`, LOG_CONTEXT);

          return await this.addToQueue(METRIC_JOB_ID, {}, '', {
            jobId: METRIC_JOB_ID,
            repeatJobKey: METRIC_JOB_ID,
            repeat: {
              immediately: true,
              pattern: '* * * * *',
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

  private getWorkerOpts(): WorkerOptions {
    return {
      ...this.bullConfig,
      lockDuration: 900,
      concurrency: 1,
      settings: {},
    } as WorkerOptions;
  }

  private getWorkerProcessor() {
    return async () => {
      return await new Promise<void>(async (resolve, reject): Promise<void> => {
        Logger.verbose('metric job started', LOG_CONTEXT);
        const deploymentName = process.env.FLEET_NAME ?? 'default';

        try {
          for (const queueService of this.token_list) {
            const metrics = await queueService.bullMqService.getQueueMetrics(0, 1);

            const completeNumber = metrics.completed.count;
            const failNumber = metrics.failed.count;

            if (process.env.NOVU_MANAGED_SERVICE === 'true' && process.env.NEW_RELIC_LICENSE_KEY.length !== 0) {
              Logger.verbose('completed length', process.env.NEW_RELIC_LICENSE_KEY.length);
              Logger.log('Recording metrics');

              const nr = require('newrelic');
              nr.recordMetric(`Queue/${deploymentName}/${queueService.name}/completed`, completeNumber);
              nr.recordMetric(`Queue/${deploymentName}/${queueService.name}/failed`, failNumber);

              Logger.verbose(`Queue/${deploymentName}/${queueService.name}/completed`, completeNumber);
              Logger.verbose(`Queue/${deploymentName}/${queueService.name}/failed`, failNumber);
            } else {
              Logger.debug(`Queue/${deploymentName}/${queueService.name}/completed`, completeNumber);
              Logger.debug(`Queue/${deploymentName}/${queueService.name}/failed`, failNumber);
            }
          }

          return resolve();
        } catch (error) {
          Logger.error('Error occurred while processing metrics', { error });

          return reject(error);
        }
      });
    };
  }
}
