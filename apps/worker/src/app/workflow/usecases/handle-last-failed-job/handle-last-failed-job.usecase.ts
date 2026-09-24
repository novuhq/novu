import { Injectable } from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  getEffectiveJobPayload,
  InstrumentUsecase,
  PinoLogger,
  TriggerAttachmentsService,
} from '@novu/application-generic';
import { JobEntity, JobRepository, NotificationRepository } from '@novu/dal';
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
    private notificationRepository: NotificationRepository,
    private triggerAttachmentsService: TriggerAttachmentsService,
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

    const nextJob = shouldHaltOnStepFailure(job)
      ? undefined
      : await this.queueNextJob.execute(
          QueueNextJobCommand.create({
            parentId: job?._id,
            environmentId: job?._environmentId,
            organizationId: job?._organizationId,
            userId: job?._userId,
            subscriberId: job?._subscriberId,
          })
        );

    if (!nextJob) {
      await this.releaseChainAttachments(job);
    }
  }

  /** The retries are exhausted and no step follows, so the chain ends with this job. */
  private async releaseChainAttachments(job: JobEntity): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne(
        { _id: job._notificationId, _environmentId: job._environmentId },
        'payload'
      );
      const payload: JobEntity['payload'] = getEffectiveJobPayload(job, notification);

      await this.triggerAttachmentsService.releaseOnce(
        { environmentId: job._environmentId, transactionId: job.transactionId, attachments: payload?.attachments },
        job._id
      );
    } catch (error: unknown) {
      this.logger.warn(
        { err: error, nv: { jobId: job._id, transactionId: job.transactionId } },
        'Failed to release the attachments of a failed workflow chain'
      );
    }
  }
}
