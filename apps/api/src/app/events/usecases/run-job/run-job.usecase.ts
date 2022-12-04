import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { StorageHelperService } from '../../services/storage-helper-service/storage-helper.service';
import { QueueNextJobCommand } from '../queue-next-job/queue-next-job.command';
import { QueueNextJob } from '../queue-next-job/queue-next-job.usecase';
import { SendMessageCommand } from '../send-message/send-message.command';
import { SendMessage } from '../send-message/send-message.usecase';
import { RunJobCommand } from './run-job.command';

@Injectable()
export class RunJob {
  constructor(
    private jobRepository: JobRepository,
    private sendMessage: SendMessage,
    private queueNextJob: QueueNextJob,
    private storageHelperService: StorageHelperService
  ) {}

  public async execute(command: RunJobCommand): Promise<JobEntity | undefined> {
    const job = await this.jobRepository.findById(command.jobId);
    const canceled = await this.delayedEventIsCanceled(job);
    if (canceled) {
      return;
    }
    let shouldQueueNextJob = true;

    try {
      await this.jobRepository.updateStatus(command.organizationId, job._id, JobStatusEnum.RUNNING);

      await this.storageHelperService.getAttachments(job.payload?.attachments);

      await this.sendMessage.execute(
        SendMessageCommand.create({
          identifier: job.identifier,
          payload: job.payload ?? {},
          overrides: job.overrides ?? {},
          step: job.step,
          transactionId: job.transactionId,
          notificationId: job._notificationId,
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          userId: job._userId,
          subscriberId: job._subscriberId,
          jobId: job._id,
          events: job.digest.events,
          job,
        })
      );

      await this.storageHelperService.deleteAttachments(job.payload?.attachments);
    } catch (error) {
      if (job.step.shouldStopOnFail) {
        shouldQueueNextJob = false;
      }
      throw new ApiException(error);
    } finally {
      if (shouldQueueNextJob) {
        await this.queueNextJob.execute(
          QueueNextJobCommand.create({
            parentId: job._id,
            environmentId: job._environmentId,
            organizationId: job._organizationId,
            userId: job._userId,
          })
        );
      }
    }
  }

  private async delayedEventIsCanceled(job: JobEntity): Promise<boolean> {
    if (job.type !== StepTypeEnum.DIGEST && job.type !== StepTypeEnum.DELAY) {
      return false;
    }
    const count = await this.jobRepository.count({
      _environmentId: job._environmentId,
      _id: job._id,
      status: JobStatusEnum.CANCELED,
    });

    return count > 0;
  }
}
