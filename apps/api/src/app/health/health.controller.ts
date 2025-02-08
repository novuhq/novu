import { Controller, Get, NotFoundException } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HealthIndicatorFunction } from '@nestjs/terminus';
import {
  CacheServiceHealthIndicator,
  DalServiceHealthIndicator,
  ExternalApiAccessible,
  WorkflowQueueServiceHealthIndicator,
} from '@novu/application-generic';

import { Body, Post } from '@nestjs/common/decorators';
import { ApiExcludeController } from '@nestjs/swagger';
import { version } from '../../../package.json';
import { DocumentationIgnore, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import {
  IdempotenceTestingResponse,
  IdempotencyBehaviorEnum,
  IdempotencyTestingDto,
} from '../testing/dtos/idempotency.dto';
import { ApiCommonResponses, ApiCreatedResponse } from '../shared/framework/response.decorator';

@Controller('health-check')
@ApiExcludeController()
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private cacheHealthIndicator: CacheServiceHealthIndicator,
    private dalHealthIndicator: DalServiceHealthIndicator,
    private workflowQueueHealthIndicator: WorkflowQueueServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthIndicatorFunction[] = [
      async () => this.dalHealthIndicator.isHealthy(),
      async () => this.workflowQueueHealthIndicator.isHealthy(),
      async () => ({
        apiVersion: {
          version,
          status: 'up',
        },
      }),
    ];

    if (process.env.ELASTICACHE_CLUSTER_SERVICE_HOST) {
      checks.push(async () => this.cacheHealthIndicator.isHealthy());
    }

    return this.healthCheckService.check(checks);
  }

  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiCommonResponses()
  @ApiCreatedResponse({ type: IdempotenceTestingResponse })
  @DocumentationIgnore()
  @SdkMethodName('testIdempotency')
  @Post('/test-idempotency')
  async testIdempotency(@Body() body: IdempotencyTestingDto): Promise<IdempotenceTestingResponse> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    const randomNumber = Math.random();
    if (body.expectedBehavior === IdempotencyBehaviorEnum.IMMEDIATE_RESPONSE) {
      return { number: randomNumber };
    }
    if (body.expectedBehavior === IdempotencyBehaviorEnum.IMMEDIATE_EXCEPTION) {
      throw new Error(new Date().toDateString());
    }
    if (body.expectedBehavior === IdempotencyBehaviorEnum.DELAYED_RESPONSE) {
      // for testing conflict
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }

    return { number: randomNumber };
  }
  @DocumentationIgnore()
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiCommonResponses()
  @ApiCreatedResponse({ type: IdempotenceTestingResponse })
  @SdkMethodName('generateRandomNumber')
  @Get('/test-idempotency')
  async generateRandomNumber(): Promise<IdempotenceTestingResponse> {
    if (process.env.NODE_ENV !== 'test') throw new NotFoundException();

    const randomNumber = Math.random();

    return { number: randomNumber };
  }
}
