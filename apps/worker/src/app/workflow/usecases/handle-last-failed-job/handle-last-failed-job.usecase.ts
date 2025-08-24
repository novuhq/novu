import { Injectable } from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  InstrumentUsecase,
  PinoLogger,
} from '@novu/application-generic';
import { JobEntity, JobRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { PlatformException, shouldHaltOnStepFailure } from '../../../shared/utils';
import { QueueNextJob, QueueNextJobCommand } from '../queue-next-job';
import { HandleLastFailedJobCommand } from './handle-last-failed-job.command';

@Injectable()
export class HandleLastFailedJob {
  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    private queueNextJob: QueueNextJob,
    private jobRepository: JobRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * This use case is only meant to be executed when a backed off job is in the last of the retry
   * attempts allowed and has also failed.
   * We isolate it here as is a use case we would need to do a DB call and it will help to minimize
   * the amount of times that call will be made.
   */
  @InstrumentUsecase()
  public async execute(command: HandleLastFailedJobCommand): Promise<void> {
    const { jobId, error } = command;

    const job = await this.jobRepository.findOne({ _id: jobId, _environmentId: command.environmentId });
    if (!job) {
      const message = `Job ${jobId} not found when handling the failure of the latest attempt for a backed off job`;
      this.logger.error(message);
      throw new PlatformException(message);
    }

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.WEBHOOK_FILTER_FAILED_LAST_RETRY,
        source: ExecutionDetailsSourceEnum.WEBHOOK,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: true,
        raw: JSON.stringify({ message: JSON.parse(error.message).message }),
      })
    );

    if (!shouldHaltOnStepFailure(job)) {
      await this.queueNextJob.execute(
        QueueNextJobCommand.create({
          parentId: job?._id,
          environmentId: job?._environmentId,
          organizationId: job?._organizationId,
          userId: job?._userId,
          subscriberId: job?._subscriberId,
        })
      );
    }
  }
}
