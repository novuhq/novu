import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import {
  DalServiceHealthIndicator,
  StandardQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
  ActiveJobsMetricQueueServiceHealthIndicator,
  CompletedJobsMetricQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
} from '@novu/application-generic';

import { version } from '../../../package.json';

@Controller('health-check')
@ApiExcludeController()
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private dalHealthIndicator: DalServiceHealthIndicator,
    private standardQueueHealthIndicator: StandardQueueServiceHealthIndicator,
    private workflowQueueHealthIndicator: WorkflowQueueServiceHealthIndicator,
    private activeJobsMetricQueueServiceHealthIndicator: ActiveJobsMetricQueueServiceHealthIndicator,
    private completedJobsMetricQueueServiceHealthIndicator: CompletedJobsMetricQueueServiceHealthIndicator,
    private subscriberProcessQueueHealthIndicator: SubscriberProcessQueueHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      async () => this.dalHealthIndicator.isHealthy(),
      async () => this.standardQueueHealthIndicator.isHealthy(),
      async () => this.workflowQueueHealthIndicator.isHealthy(),
      async () => this.activeJobsMetricQueueServiceHealthIndicator.isHealthy(),
      async () => this.completedJobsMetricQueueServiceHealthIndicator.isHealthy(),
      async () => this.subscriberProcessQueueHealthIndicator.isHealthy(),
      async () => {
        return {
          apiVersion: {
            version,
            status: 'up',
          },
        };
      },
    ]);
  }
}
