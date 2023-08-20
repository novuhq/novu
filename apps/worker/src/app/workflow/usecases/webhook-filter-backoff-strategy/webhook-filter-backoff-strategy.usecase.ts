import { Injectable, Logger } from '@nestjs/common';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { DetailEnum, CreateExecutionDetails, CreateExecutionDetailsCommand } from '@novu/application-generic';

import { WebhookFilterBackoffStrategyCommand } from './webhook-filter-backoff-strategy.command';

@Injectable()
export class WebhookFilterBackoffStrategy {
  constructor(private createExecutionDetails: CreateExecutionDetails) {}

  public async execute(command: WebhookFilterBackoffStrategyCommand): Promise<number> {
    const { attemptsMade, eventError: error, eventJob } = command;
    const job = eventJob.data;

    try {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.WEBHOOK_FILTER_FAILED_RETRY,
          source: ExecutionDetailsSourceEnum.WEBHOOK,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: true,
          raw: JSON.stringify({ message: JSON.parse(error?.message).message, attempt: attemptsMade }),
        })
      );
    } catch (anotherError) {
      Logger.error(
        anotherError,
        'Failed to create the execution details for backoff strategy',
        'WebhookFilterBackoffStrategy'
      );
    }

    return Math.round(Math.random() * Math.pow(2, attemptsMade) * 1000);
  }
}
