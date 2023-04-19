const nr = require('newrelic');
import { Job, WorkerOptions } from 'bullmq';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, getRedisPrefix } from '@novu/shared';
import {
  QueueService,
  PinoLogger,
  storage,
  Store,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '@novu/application-generic';

import {
  RunJob,
  RunJobCommand,
  QueueNextJob,
  QueueNextJobCommand,
  SetJobAsCommand,
  SetJobAsCompleted,
  SetJobAsFailed,
  SetJobAsFailedCommand,
  WebhookFilterBackoffStrategy,
} from '../usecases';

@Injectable()
export class MetricQueueService extends QueueService<Record<string, never>> {
  constructor() {
    super('cron');
    Logger.warn('Metric queue service created');

    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());

    this.bullMqService.worker.on('completed', async (job) => {
      await this.jobHasCompleted(job);
    });

    this.bullMqService.worker.on('failed', async (job, error) => {
      await this.jobHasFailed(job, error);
    });

    void this.addToQueue('metric-job', {}, '', { repeat: { pattern: '* * * * * *' } });
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
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        nr.startBackgroundTransaction('job-processing-queue', 'Trigger Engine', function () {
          const transaction = nr.getTransaction();

          storage.run(new Store(PinoLogger.root), () => {
            Logger.log('Metric job started');
          });
        });
      });
    };
  }

  private async jobHasCompleted(job): Promise<void> {
    try {
      Logger.error('Metric job Completed');
    } catch (error) {
      Logger.error('Failed to set job as completed', error);
    }
  }

  private async jobHasFailed(job, error): Promise<void> {
    try {
      Logger.error('Metric job failed', error);
    } catch (anotherError) {
      Logger.error('Failed to set job as failed', anotherError);
    }
  }
}
