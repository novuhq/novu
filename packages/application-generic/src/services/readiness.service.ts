import { Inject, Injectable, Logger } from '@nestjs/common';

import { Worker } from './bull-mq';

import {
  StandardQueueServiceHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';

export interface INovuWorker {
  readonly DEFAULT_ATTEMPTS: number;
  gracefulShutdown: () => Promise<void>;
  readonly topic: string;
  onModuleDestroy: () => Promise<void>;
  pauseWorker: () => Promise<void>;
  resumeWorker: () => Promise<void>;
  worker: Worker;
}

const LOG_CONTEXT = 'ReadinessService';

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(StandardQueueServiceHealthIndicator)
    private standardQueueServiceHealthIndicator: StandardQueueServiceHealthIndicator,
    @Inject(WorkflowQueueServiceHealthIndicator)
    private workflowQueueServiceHealthIndicator: WorkflowQueueServiceHealthIndicator
  ) {}

  async areQueuesEnabled(): Promise<boolean> {
    Logger.log('Enabling queues as workers are meant to be ready', LOG_CONTEXT);

    try {
      const healths = await Promise.all([
        this.standardQueueServiceHealthIndicator.isHealthy(),
        this.workflowQueueServiceHealthIndicator.isHealthy(),
      ]);

      const result = healths.every((health) => !!health === true);

      Logger.log(`The result of the Queue healths is ${result}`, LOG_CONTEXT);

      return result;
    } catch (error) {
      Logger.error(
        error,
        'Some health indicator throw an error when checking if queues are enabled',
        LOG_CONTEXT
      );

      return false;
    }
  }

  async pauseWorkers(workers: INovuWorker[]): Promise<void> {
    for (const worker of workers) {
      try {
        Logger.log(`Pausing worker ${worker.topic}...`, LOG_CONTEXT);

        await worker.pauseWorker();
      } catch (error) {
        Logger.error(
          error,
          `Failed to pause worker ${worker.topic}.`,
          LOG_CONTEXT
        );

        throw error;
      }
    }
  }

  async enableWorkers(workers: INovuWorker[]): Promise<void> {
    const areQueuesEnabled = await this.areQueuesEnabled();

    if (areQueuesEnabled) {
      for (const worker of workers) {
        try {
          Logger.log(`Resuming worker ${worker.topic}...`, LOG_CONTEXT);

          await worker.resumeWorker();
        } catch (error) {
          Logger.error(
            error,
            `Failed to resume worker ${worker.topic}.`,
            LOG_CONTEXT
          );

          throw error;
        }
      }
    }
  }
}
