import { Injectable } from '@nestjs/common';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

import { WebhookFilterBackoffStrategyCommand } from './webhook-filter-backoff-strategy.command';

import { DetailEnum } from '../../../../../../api/src/app/execution-details/types';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '../../../../../../api/src/app/execution-details/usecases/create-execution-details';

@Injectable()
export class WebhookFilterBackoffStrategy {
  constructor(private createExecutionDetails: CreateExecutionDetails) {}

  public async execute(command: WebhookFilterBackoffStrategyCommand): Promise<number> {
    const { attemptsMade, eventError: error, eventJob } = command;
    const job = eventJob.data;

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

    return Math.round(Math.random() * Math.pow(2, attemptsMade) * 1000);
  }
}
