const nr = require('newrelic');
import { Job, WorkerOptions } from 'bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@novu/application-generic';
import { IJobData, JobTopicNameEnum } from '@novu/shared';
import { min, max, sum, mean } from 'simple-statistics';

interface IMetric {
  count: number;
  total: number;
  min: number;
  max: number;
  sumOfSquares: number;
}

function sumOfSquares(values: number[]): number {
  const meanVal = mean(values);

  return sum(values.map((value) => (value - meanVal) ** 2));
}

const LOG_CONTEXT = 'MetricQueueService';
const METRIC_JOB_ID = 'metric-job';

@Injectable()
export class MetricQueueService extends QueueService<Record<string, never>> {
  constructor(@Inject('BULLMQ_LIST') private token_list: QueueService[]) {
    super(JobTopicNameEnum.METRICS);

    this.bullMqService.createWorker(JobTopicNameEnum.METRICS, this.getWorkerProcessor(), this.getWorkerOptions());

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
      .then(async (exists: boolean): Promise<void> => {
        Logger.debug(`metric job exists: ${exists}`, LOG_CONTEXT);

        if (!exists) {
          Logger.debug(`metricJob doesn't exist, creating it`, LOG_CONTEXT);

          return await this.addToQueue(METRIC_JOB_ID, undefined, '', {
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
      .catch((error) => Logger.error('Metric Job Exists function errored', error, LOG_CONTEXT));
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 500,
      concurrency: 1,
      settings: {},
    };
  }

  private getWorkerProcessor() {
    return async () => {
      return await new Promise<void>(async (resolve, reject): Promise<void> => {
        Logger.verbose('metric job started', LOG_CONTEXT);

        try {
          for (const queueService of this.token_list) {
            const metrics = await queueService.bullMqService.getQueueMetrics();

            const completeNumber = metrics.completed.count;
            const failNumber = metrics.failed.count;

            const successMetric: IMetric = {
              count: metrics.completed.count,
              total: completeNumber == 0 ? 0 : sum(metrics.completed.data),
              min: completeNumber == 0 ? 0 : min(metrics.completed.data),
              max: completeNumber == 0 ? 0 : max(metrics.completed.data),
              sumOfSquares: completeNumber == 0 ? 0 : sumOfSquares(metrics.completed.data),
            };

            const failMetric: IMetric = {
              count: metrics.failed.count,
              total: failNumber == 0 ? 0 : sum(metrics.failed.data),
              min: failNumber == 0 ? 0 : min(metrics.failed.data),
              max: failNumber == 0 ? 0 : max(metrics.failed.data),
              sumOfSquares: failNumber == 0 ? 0 : sumOfSquares(metrics.failed.data),
            };

            const waitCount = await queueService.bullMqService.queue.getWaitingCount();
            const delayedCount = await queueService.bullMqService.queue.getDelayedCount();
            const activeCount = await queueService.bullMqService.queue.getActiveCount();

            if (process.env.NOVU_MANAGED_SERVICE === 'true') {
              nr.recordMetric(`MetricQueueService/${queueService.name}/completed`, successMetric);
              nr.recordMetric(`MetricQueueService/${queueService.name}/failed`, failMetric);
              nr.recordMetric(`MetricQueueService/${queueService.name}/waiting`, waitCount);
              nr.recordMetric(`MetricQueueService/${queueService.name}/delayed`, delayedCount);
              nr.recordMetric(`MetricQueueService/${queueService.name}/active`, activeCount);
            } else {
              Logger.debug(`MetricQueueService/${queueService.name}/completed`, JSON.stringify(successMetric));
              Logger.debug(`MetricQueueService/${queueService.name}/failed`, JSON.stringify(failMetric));
              Logger.debug(`MetricQueueService/${queueService.name}/waiting`, waitCount);
              Logger.debug(`MetricQueueService/${queueService.name}/delayed`, delayedCount);
              Logger.debug(`MetricQueueService/${queueService.name}/active`, activeCount);
            }
          }

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    };
  }

  private async jobHasCompleted(job): Promise<void> {
    Logger.verbose('Metric job Completed', job.id, LOG_CONTEXT);
  }

  private async jobHasFailed(job, error): Promise<void> {
    Logger.verbose('Metric job failed', error, LOG_CONTEXT);
  }
}
