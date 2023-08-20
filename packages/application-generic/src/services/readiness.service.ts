import { Injectable, Logger } from '@nestjs/common';

import { BullMqService } from './bull-mq.service';

import {
  QueueServiceHealthIndicator,
  TriggerQueueServiceHealthIndicator,
  WsQueueServiceHealthIndicator,
} from '../health';

export interface INovuWorker {
  name: string;
  bullMqService: BullMqService;
  gracefulShutdown: () => Promise<void>;
  pauseWorker: () => Promise<void>;
  resumeWorker: () => Promise<void>;
}

const LOG_CONTEXT = 'ReadinessService';

@Injectable()
export class ReadinessService {
  constructor(
    private queueServiceHealthIndicator: QueueServiceHealthIndicator,
    private triggerQueueServiceHealthIndicator: TriggerQueueServiceHealthIndicator,
    private wsQueueServiceHealthIndicator: WsQueueServiceHealthIndicator
  ) {}

  async areQueuesEnabled(): Promise<boolean> {
    Logger.log('Enabling queues as workers are meant to be ready', LOG_CONTEXT);

    try {
      const healths = await Promise.all([
        this.queueServiceHealthIndicator.isHealthy(),
        this.triggerQueueServiceHealthIndicator.isHealthy(),
        this.wsQueueServiceHealthIndicator.isHealthy(),
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
