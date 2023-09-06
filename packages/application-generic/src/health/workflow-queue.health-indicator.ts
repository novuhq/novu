import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { WorkflowQueueService } from '../services';

const LOG_CONTEXT = 'WorkflowQueueServiceHealthIndicator';

@Injectable()
export class WorkflowQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'workflowQueue';

  constructor(private workflowQueueService: WorkflowQueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.workflowQueueService.isReady();

    if (isReady) {
      Logger.verbose('WorkflowQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('WorkflowQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'Workflow Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
