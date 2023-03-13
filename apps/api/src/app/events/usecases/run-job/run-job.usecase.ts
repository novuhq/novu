import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';

import { RunJobCommand } from './run-job.command';

import { QueueNextJob, QueueNextJobCommand } from '../queue-next-job';
import { SendMessage, SendMessageCommand } from '../send-message';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { StorageHelperService } from '../../services/storage-helper-service/storage-helper.service';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER } from '../../../shared/constants';

@Injectable()
export class RunJob {
  constructor(
    private jobRepository: JobRepository,
    private sendMessage: SendMessage,
    private queueNextJob: QueueNextJob,
    private storageHelperService: StorageHelperService
  ) {}

  public async execute(command: RunJobCommand): Promise<JobEntity | undefined> {
    Sentry.setUser({
      id: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    });

    const job = await this.jobRepository.findById(command.jobId);
    if (!job) throw new ApiException(`Job with id ${command.jobId} not found`);

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
          events: job.digest?.events,
          job,
        })
      );

      await this.storageHelperService.deleteAttachments(job.payload?.attachments);
    } catch (error) {
      if (job.step.shouldStopOnFail || this.shouldBackoff(error)) {
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

  public shouldBackoff(error: Error): boolean {
    return error.message.includes(EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER);
  }
}
