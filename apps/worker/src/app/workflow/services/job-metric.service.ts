const nr = require('newrelic');
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  JobMetricsQueueService,
  JobMetricsWorkerService,
  QueueBaseService,
  WorkerOptions,
} from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
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

const LOG_CONTEXT = 'JobMetricService';
const METRIC_JOB_ID = 'metric-job';

/**
 * TODO: This service should be split in 2 but have no mental capacity right now
 * to think how to do.
 */
@Injectable()
export class JobMetricService {
  constructor(
    @Inject('BULL_MQ_TOKEN_LIST')
    private tokenList: QueueBaseService[],
    public readonly jobMetricsQueueService: JobMetricsQueueService,
    public readonly jobMetricsWorkerService: JobMetricsWorkerService
  ) {
    this.jobMetricsQueueService.createQueue();
    this.jobMetricsWorkerService.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());

    this.jobMetricsWorkerService.worker.on('completed', async (job, error) => {
      await this.jobHasCompleted(job);
    });

    this.jobMetricsWorkerService.worker.on('failed', async (job, error) => {
      await this.jobHasFailed(job, error);
    });

    this.addToQueueIfMetricJobExists();
  }

  private addToQueueIfMetricJobExists(): void {
    Promise.resolve(
      this.jobMetricsQueueService.queue.getRepeatableJobs().then((job): boolean => {
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

          return await this.jobMetricsQueueService.add(METRIC_JOB_ID, undefined, '', {
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
      .catch((error) => Logger.error(error, 'Metric Job Exists function errored', LOG_CONTEXT));
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
          for (const queueService of this.tokenList) {
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
              nr.recordMetric(`MetricQueueService/${queueService.topic}/completed`, successMetric);
              nr.recordMetric(`MetricQueueService/${queueService.topic}/failed`, failMetric);
              nr.recordMetric(`MetricQueueService/${queueService.topic}/waiting`, waitCount);
              nr.recordMetric(`MetricQueueService/${queueService.topic}/delayed`, delayedCount);
              nr.recordMetric(`MetricQueueService/${queueService.topic}/active`, activeCount);
            } else {
              Logger.debug(`MetricQueueService/${queueService.topic}/completed`, JSON.stringify(successMetric));
              Logger.debug(`MetricQueueService/${queueService.topic}/failed`, JSON.stringify(failMetric));
              Logger.debug(`MetricQueueService/${queueService.topic}/waiting`, waitCount);
              Logger.debug(`MetricQueueService/${queueService.topic}/delayed`, delayedCount);
              Logger.debug(`MetricQueueService/${queueService.topic}/active`, activeCount);
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

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Queue service down', LOG_CONTEXT);

    await this.jobMetricsQueueService.gracefulShutdown();
    await this.jobMetricsWorkerService.gracefulShutdown();

    Logger.log('Shutting down the Queue service has finished', LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
