import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
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
} from '../../usecases';
import { JobsOptions, StandardQueueService } from '../../services';
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
    @Inject(forwardRef(() => StandardQueueService))
    private standardQueueService: StandardQueueService,
    private createExecutionDetails: CreateExecutionDetails,
    private addDigestJob: AddDigestJob,
    private addDelayJob: AddDelayJob
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

    if (job.type === StepTypeEnum.DIGEST) {
      Logger.debug(`DigestAmount is: ${digestAmount}`, LOG_CONTEXT);
    }

    if (job.type === StepTypeEnum.DIGEST && digestAmount === undefined) {
      Logger.warn(
        `Digest Amount does not exist on a digest job ${job._id}`,
        LOG_CONTEXT
      );

      return;
    }

    const delayAmount =
      job.type === StepTypeEnum.DELAY
        ? await this.addDelayJob.execute(command)
        : undefined;

    if (job.type === StepTypeEnum.DELAY) {
      Logger.debug(`Delay Amount is: ${delayAmount}`, LOG_CONTEXT);
    }

    if (job.type === StepTypeEnum.DELAY && delayAmount === undefined) {
      Logger.warn(
        `Delay Amount does not exist on a delay job ${job._id}`,
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

    const delay = digestAmount ?? delayAmount;

    Logger.verbose(`Adding Job ${job._id} to Queue`, LOG_CONTEXT);
    const stepContainsWebhookFilter = this.stepContainsFilter(job, 'webhook');
    const options: JobsOptions = {
      delay,
    };
    if (stepContainsWebhookFilter) {
      options.backoff = {
        type: BackoffStrategiesEnum.WEBHOOK_FILTER_BACKOFF,
      };
      options.attempts = this.standardQueueService.DEFAULT_ATTEMPTS;
    }

    const jobData = {
      _environmentId: job._environmentId,
      _id: job._id,
      _organizationId: job._organizationId,
      _userId: job._userId,
    };

    Logger.verbose(
      jobData,
      'Going to add a minimal job in Standard Queue',
      LOG_CONTEXT
    );
    await this.standardQueueService.addMinimalJob(
      job._id,
      jobData,
      command.organizationId,
      options
    );

    if (delay) {
      const logMessage =
        job.type === StepTypeEnum.DELAY
          ? 'Delay is active, Creating execution details'
          : job.type === StepTypeEnum.DIGEST
          ? 'Digest is active, Creating execution details'
          : 'Unexpected job type, Creating execution details';

      Logger.verbose(logMessage, LOG_CONTEXT);
      this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail:
            job.type === StepTypeEnum.DELAY
              ? DetailEnum.STEP_DELAYED
              : DetailEnum.STEP_DIGESTED,
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
