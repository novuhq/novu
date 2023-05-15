const nr = require('newrelic');
import { WorkerOptions } from 'bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@novu/application-generic';

const LOG_CONTEXT = 'MetricQueueService';
const METRIC_JOB_ID = 'metric-job';

@Injectable()
export class MetricQueueService extends QueueService<Record<string, never>> {
  constructor(@Inject('BULLMQ_LIST') private token_list: QueueService[]) {
    super('metric');

    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());

    this.bullMqService.worker.on('completed', async (job) => {
      await this.jobHasCompleted(job);
    });

    this.bullMqService.worker.on('failed', async (job, error) => {
      await this.jobHasFailed(job, error);
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
              pattern: '* * * * * *',
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
      lockDuration: 500,
      concurrency: 1,
      settings: {},
    } as WorkerOptions;
  }

  private getWorkerProcessor() {
    return async () => {
      return await new Promise<void>(async (resolve, reject): Promise<void> => {
        Logger.verbose('metric job started', LOG_CONTEXT);

        try {
          for (const queueService of this.token_list) {
            const metrics = await queueService.bullMqService.getQueueMetrics(0, 1);

            const completeNumber = metrics.completed.count;
            const failNumber = metrics.failed.count;

            const waitCount = await queueService.bullMqService.queue.getWaitingCount();
            const delayedCount = await queueService.bullMqService.queue.getDelayedCount();
            const activeCount = await queueService.bullMqService.queue.getActiveCount();

            if (process.env.NOVU_MANAGED_SERVICE === 'true') {
              Logger.log('Recording metrics');

              nr.recordMetric(`MetricQueueService/${queueService.name}/completed`, completeNumber);
              nr.recordMetric(`MetricQueueService/${queueService.name}/failed`, failNumber);
              nr.recordMetric(`MetricQueueService/${queueService.name}/waiting`, waitCount);
              nr.recordMetric(`MetricQueueService/${queueService.name}/delayed`, delayedCount);
              nr.recordMetric(`MetricQueueService/${queueService.name}/active`, activeCount);

              Logger.verbose(`MetricQueueService/${queueService.name}/completed`, completeNumber);
              Logger.verbose(`MetricQueueService/${queueService.name}/failed`, failNumber);
              Logger.verbose(`MetricQueueService/${queueService.name}/waiting`, waitCount);
              Logger.verbose(`MetricQueueService/${queueService.name}/delayed`, delayedCount);
              Logger.verbose(`MetricQueueService/${queueService.name}/active`, activeCount);
            } else {
              Logger.log(`MetricQueueService/${queueService.name}/completed`, completeNumber);
              Logger.log(`MetricQueueService/${queueService.name}/failed`, failNumber);
              Logger.log(`MetricQueueService/${queueService.name}/waiting`, waitCount);
              Logger.log(`MetricQueueService/${queueService.name}/delayed`, delayedCount);
              Logger.log(`MetricQueueService/${queueService.name}/active`, activeCount);
            }
          }

          return resolve();
        } catch (error) {
          console.log({ error });

          return reject(error);
        }
      });
    };
  }

  private async jobHasCompleted(job): Promise<void> {
    Logger.verbose('Metric job Completed', job.id, LOG_CONTEXT);
  }

  private async jobHasFailed(job, error): Promise<void> {
    Logger.verbose('Metric job failed', LOG_CONTEXT, error);
  }
}
