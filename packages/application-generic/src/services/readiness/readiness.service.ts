import { Injectable, Logger } from '@nestjs/common';

import { Worker } from '../bull-mq';

import {
  StandardQueueServiceHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../../health';

export interface INovuWorker {
  readonly DEFAULT_ATTEMPTS: number;
  gracefulShutdown: () => Promise<void>;
  readonly topic: string;
  onModuleDestroy: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  worker: Worker;
}

const LOG_CONTEXT = 'ReadinessService';

@Injectable()
export class ReadinessService {
  constructor(
    private standardQueueServiceHealthIndicator: StandardQueueServiceHealthIndicator,
    private workflowQueueServiceHealthIndicator: WorkflowQueueServiceHealthIndicator
  ) {}

  async areQueuesEnabled(): Promise<boolean> {
    Logger.log('Enabling queues as workers are meant to be ready', LOG_CONTEXT);

    try {
      const healths = await Promise.all([
        this.standardQueueServiceHealthIndicator.isHealthy(),
        this.workflowQueueServiceHealthIndicator.isHealthy(),
      ]);

      return healths.every((health) => !!health === true);
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
        Logger.verbose(`Pausing worker ${worker.topic}...`, LOG_CONTEXT);

        await worker.pause();
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
          Logger.verbose(`Resuming worker ${worker.topic}...`, LOG_CONTEXT);

          await worker.resume();
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
