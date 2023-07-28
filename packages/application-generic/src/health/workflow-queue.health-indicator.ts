import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable } from '@nestjs/common';

import { WorkflowQueueService } from '../services';

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
    const runningStatus =
      await this.workflowQueueService.bullMqService.getRunningStatus();

    if (!runningStatus.queueIsPaused) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'Workflow Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
