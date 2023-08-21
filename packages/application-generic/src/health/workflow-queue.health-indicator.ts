import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { WorkflowQueueService } from '../services';

const LOG_CONTEXT = 'WorkflowQueueServiceHealthIndicator';

@Injectable()
export class WorkflowQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'workflowQueue';

  constructor(
    @Inject(WorkflowQueueService)
    private workflowQueueService: WorkflowQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    Logger.log('Checking the health', LOG_CONTEXT);

    const runningStatus =
      await this.workflowQueueService.bullMqService.getRunningStatus();

    Logger.warn({ runningStatus }, 'Running status', LOG_CONTEXT);

    if (!runningStatus.queueIsPaused) {
      Logger.log('WorkflowQueueService is not paused', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.log('WorkflowQueueService is paused', LOG_CONTEXT);

    throw new HealthCheckError(
      'Workflow Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
