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
import { InstrumentUsecase } from '../../instrumentation';

export enum BackoffStrategiesEnum {
  WEBHOOK_FILTER_BACKOFF = 'webhookFilterBackoff',
}

const LOG_CONTEXT = 'AddJob';

@Injectable()
export class AddJob {
  constructor(
    private jobRepository: JobRepository,
    private createExecutionDetails: CreateExecutionDetails,
    private addDigestJob: AddDigestJob,
    private addDelayJob: AddDelayJob,
    public readonly queueService: QueueService
  ) {}

  @InstrumentUsecase()
  @LogDecorator()
  public async execute(command: AddJobCommand): Promise<void> {
    Logger.verbose('Getting Job', LOG_CONTEXT);
    const job =
      command.job ?? (await this.jobRepository.findById(command.jobId));
    Logger.debug(`Job contents for job ${job._id}`, job, LOG_CONTEXT);

    if (!job) {
      Logger.warn(
        `Job ${job._id} was null in both the input and search`,
        LOG_CONTEXT
      );

      return;
    }

    Logger.log(`Starting New Job ${job._id} of type: ${job.type}`, LOG_CONTEXT);

    const digestAmount =
      job.type === StepTypeEnum.DIGEST
        ? await this.addDigestJob.execute(AddDigestJobCommand.create({ job }))
        : undefined;
    Logger.debug(`DigestAmount is: ${digestAmount}`, LOG_CONTEXT);

    const delayAmount =
      job.type === StepTypeEnum.DELAY
        ? await this.addDelayJob.execute(command)
        : undefined;
    Logger.debug(`DelayAmount is: ${delayAmount}`, LOG_CONTEXT);

    if (job.type === StepTypeEnum.DIGEST && digestAmount === undefined) {
      Logger.warn(
        `Digest Amount does not exist on a digest job ${job._id}`,
        LOG_CONTEXT
      );

      return;
    }

    if (digestAmount === undefined && delayAmount === undefined) {
      Logger.verbose(
        `Updating status to queued for job ${job._id}`,
        LOG_CONTEXT
      );
      await this.jobRepository.updateStatus(
        command.environmentId,
        job._id,
        JobStatusEnum.QUEUED
      );
    }

    const delay = digestAmount ?? delayAmount;
    Logger.debug('Delay is: ' + delay, LOG_CONTEXT);

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
        'Variable delay is null which is not apart of the definition',
        LOG_CONTEXT
      );
    }

    Logger.verbose(`Adding Job ${job._id} to Queue`, LOG_CONTEXT);
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

    const jobData = {
      _environmentId: job._environmentId,
      _id: job._id,
      _organizationId: job._organizationId,
      _userId: job._userId,
    };

    await this.queueService.addToQueue(
      job._id,
      jobData,
      command.organizationId,
      options
    );

    if (delay) {
      Logger.verbose(
        'Delay is active, Creating execution details',
        LOG_CONTEXT
      );
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
