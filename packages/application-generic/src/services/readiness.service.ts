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
  readonly name: string;
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
    @Inject(WebSocketsQueueServiceHealthIndicator)
    private webSocketsQueueServiceHealthIndicator: WebSocketsQueueServiceHealthIndicator,
    @Inject(WorkflowQueueServiceHealthIndicator)
    private workflowQueueServiceHealthIndicator: WorkflowQueueServiceHealthIndicator
  ) {}

  async areQueuesEnabled(): Promise<boolean> {
    Logger.log('Enabling queues as workers are meant to be ready', LOG_CONTEXT);

    try {
      const healths = await Promise.all([
        this.standardQueueServiceHealthIndicator.isHealthy(),
        this.webSocketsQueueServiceHealthIndicator.isHealthy(),
        this.workflowQueueServiceHealthIndicator.isHealthy(),
      ]);

      return healths.every((health) => !!health === true);
    } catch (error) {
      Logger.error(
        'Some health indicator throw an error when checking if queues are enabled',
        error,
        LOG_CONTEXT
      );

      return false;
    }
  }

  async pauseWorkers(workers: INovuWorker[]): Promise<void> {
    for (const worker of workers) {
      Logger.log(`Pausing worker ${worker.name}...`, LOG_CONTEXT);
      await worker.pauseWorker();
    }
  }

  async enableWorkers(workers: INovuWorker[]): Promise<void> {
    const areQueuesEnabled = await this.areQueuesEnabled();

    if (areQueuesEnabled) {
      for (const worker of workers) {
        Logger.log(`Resuming worker ${worker.name}...`, LOG_CONTEXT);
        await worker.resumeWorker();
      }
    }
  }
}
