import { Logger, Injectable } from '@nestjs/common';
import { JobsOptions } from 'bullmq';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import {
  StepTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';

import { AddDelayJob } from './add-delay-job.usecase';
import { AddDigestJobCommand } from './add-digest-job.command';
import { AddDigestJob } from './add-digest-job.usecase';
import { AddJobCommand } from './add-job.command';
import {
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '../create-execution-details';
import { QueueService } from '../../services';
import { LogDecorator } from '../../logging';

export enum BackoffStrategiesEnum {
  WEBHOOK_FILTER_BACKOFF = 'webhookFilterBackoff',
}

@Injectable()
export class AddJob {
  constructor(
    private jobRepository: JobRepository,
    private queueService: QueueService,
    private createExecutionDetails: CreateExecutionDetails,
    private addDigestJob: AddDigestJob,
    private addDelayJob: AddDelayJob
  ) {}

  @LogDecorator()
  public async execute(command: AddJobCommand): Promise<void> {
    Logger.verbose('Getting Job');
    const job =
      command.job ?? (await this.jobRepository.findById(command.jobId));
    Logger.debug(job, 'job contents');

    if (!job) {
      Logger.warn('job was null in both the input and search');

      return;
    }

    Logger.log('Starting New Job of type: ' + job.type);

    const digestAmount =
      job.type === StepTypeEnum.DIGEST
        ? await this.addDigestJob.execute(AddDigestJobCommand.create({ job }))
        : undefined;
    Logger.debug('digestAmount is: ' + digestAmount);

    const delayAmount =
      job.type === StepTypeEnum.DELAY
        ? await this.addDelayJob.execute(command)
        : undefined;
    Logger.debug('delayAmount is: ' + delayAmount);

    if (job.type === StepTypeEnum.DIGEST && digestAmount === undefined) {
      Logger.warn('Digest Amount does not exist on a digest job');

      return;
    }

    if (digestAmount === undefined && delayAmount === undefined) {
      Logger.verbose(
        'updating status as digestAmount and delayAmount is undefined'
      );
      await this.jobRepository.updateStatus(
        command.organizationId,
        job._id,
        JobStatusEnum.QUEUED
      );
    }

    const delay = digestAmount ?? delayAmount;
    Logger.debug('delay is: ' + delay);

    this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.STEP_QUEUED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );

    if (delay === null) {
      Logger.warn(
        'variable delay is null which is not apart of the definition'
      );
    }

    Logger.verbose('Adding Job to Queue');
    const stepContainsWebhookFilter = this.stepContainsFilter(job, 'webhook');
    const options: JobsOptions = {
      delay,
    };
    if (stepContainsWebhookFilter) {
      options.backoff = {
        type: BackoffStrategiesEnum.WEBHOOK_FILTER_BACKOFF,
      };
      options.attempts = this.queueService.DEFAULT_ATTEMPTS;
    }
    await this.queueService.addToQueue(
      job._id,
      job,
      command.organizationId,
      options
    );

    if (delay) {
      Logger.verbose('Delay is active, Creating execution details');
      this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_DELAYED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ delay }),
        })
      );
    }
  }

  private stepContainsFilter(job: JobEntity, onFilter: string) {
    return job.step.filters?.some((filter) => {
      return filter.children?.some((child) => {
        return child.on === onFilter;
      });
    });
  }
}
