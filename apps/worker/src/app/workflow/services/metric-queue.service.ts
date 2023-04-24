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

    Logger.warn('Metric queue service created');

    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());

    this.bullMqService.worker.on('completed', async (job) => {
      await this.jobHasCompleted(job);
    });

    this.bullMqService.worker.on('failed', async (job, error) => {
      await this.jobHasFailed(job, error);
    });

    void this.addToQueue('metric-job', {}, '', {
      repeat: {
        immediately: true,
        pattern: '* * * * * *',
      },
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
      lockDuration: 90000,
      concurrency: 200,
      settings: {},
    } as WorkerOptions;
  }

  private getWorkerProcessor() {
    return async () => {
      return await new Promise(async (resolve, reject) => {
        for (const queueService of this.token_list) {
          this.bullMqService.createQueue(queueService.name, {
            ...this.bullConfig,
            defaultJobOptions: {
              removeOnComplete: true,
            },
          });

          const metrics = await this.bullMqService.getQueueMetrics();

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

          Logger.log(`${process.env.NOVU_MANAGED_SERVICE}: managed`);
          Logger.log(`MetricQueueService/${queueService.name}/completed`, JSON.stringify(successMetric));
          Logger.log(`MetricQueueService/${queueService.name}/completed`, JSON.stringify(failMetric));
          if (process.env.NOVU_MANAGED_SERVICE === 'true') {
            Logger.log(`MetricQueueService/${queueService.name}/completed`, JSON.stringify(successMetric));
            Logger.log(`MetricQueueService/${queueService.name}/completed`, JSON.stringify(failMetric));
          } else {
            nr.recordMetric(`MetricQueueService/${queueService.name}/completed`, successMetric);
            nr.recordMetric(`MetricQueueService/${queueService.name}/failed`, failMetric);
          }
        }
      });
    };
  }

  private async jobHasCompleted(job): Promise<void> {
    try {
      Logger.log('Metric job Completed');
    } catch (error) {
      Logger.error('Failed to set job as completed', error);
    }
  }

  private async jobHasFailed(job, error): Promise<void> {
    try {
      Logger.log('Metric job failed', error);
    } catch (anotherError) {
      Logger.error(`Failed to set job as failed ${anotherError}`);
    }
  }
}
