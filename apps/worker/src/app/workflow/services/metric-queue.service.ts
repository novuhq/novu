const nr = require('newrelic');
import { WorkerOptions } from 'bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@novu/application-generic';
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

    const metricJobExists = Promise.resolve(
      this.bullMqService.queue.getRepeatableJobs().then(async (job) => {
        let exists = false;
        for (const jobElement of job) {
          if (jobElement.id === 'metric-job') {
            exists = true;
          }
        }

        return exists;
      })
    );

    metricJobExists.then((exists) => {
      Logger.debug('metric job exists: ' + exists);

      if (!exists) {
        Logger.debug("metricJob doesn't exist, creating it");
        void this.addToQueue('metric-job', {}, '', {
          jobId: 'metric-job',
          repeatJobKey: 'metric-job',
          repeat: {
            immediately: true,
            pattern: '* * * * * *',
          },
          removeOnFail: true,
          removeOnComplete: true,
          attempts: 1,
        });
      }

      return true;
    });
  }

  public async gracefulShutdown() {
    // Right now we only want this for testing purposes
    if (process.env.NODE_ENV === 'test') {
      await this.bullMqService.queue.drain();
      await this.bullMqService.worker.close();
    }
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
        Logger.verbose('metric job started');

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
            Logger.log(`MetricQueueService/${queueService.name}/completed`, JSON.stringify(successMetric));
            Logger.log(`MetricQueueService/${queueService.name}/failed`, JSON.stringify(failMetric));
            Logger.log(`MetricQueueService/${queueService.name}/waiting`, waitCount);
            Logger.log(`MetricQueueService/${queueService.name}/delayed`, delayedCount);
            Logger.log(`MetricQueueService/${queueService.name}/active`, activeCount);
          }
        }
        resolve();
      });
    };
  }

  private async jobHasCompleted(job): Promise<void> {
    Logger.verbose('Metric job Completed', job.id);
  }

  private async jobHasFailed(job, error): Promise<void> {
    Logger.verbose('Metric job failed', error);
  }
}
