import { Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import * as Sentry from '@sentry/node';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { StorageHelperService } from '../../services/storage-helper-service/storage-helper.service';
import { SendMessageCommand } from '../send-message/send-message.command';
import { SendMessage } from '../send-message/send-message.usecase';
import { DigestService } from '../../services/digest/digest-service';
import { MinimalJob } from '../../services/workflow-queue/workflow-queue';

@Injectable()
export class RunJob {
  constructor(
    private jobRepository: JobRepository,
    private sendMessage: SendMessage,
    protected digestService: DigestService,
    private storageHelperService: StorageHelperService
  ) {}

  public async execute(command: MinimalJob): Promise<JobStatusEnum> {
    Sentry.setUser({
      id: command._userId,
      organizationId: command._organizationId,
      environmentId: command._environmentId,
    });

    try {
      const job = await this.jobRepository.findById(command._id);
      if (!job) throw new ApiException(`Job with id ${command._id} not found`);
      if (job.status === JobStatusEnum.CANCELED) return JobStatusEnum.CANCELED;

      await this.jobRepository.updateStatus(command._organizationId, job._id, JobStatusEnum.RUNNING);
      const payload = await this.digestService.getPayload(job);
      await this.storageHelperService.getAttachments(job.payload?.attachments);
      await this.sendMessage.execute(
        SendMessageCommand.create({
          identifier: job.identifier,
          payload: payload,
          overrides: job.overrides ?? {},
          step: job.step,
          transactionId: job.transactionId,
          notificationId: job._notificationId,
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          userId: job._userId,
          subscriberId: job._subscriberId,
          jobId: job._id,
          job,
        })
      );
      await this.storageHelperService.deleteAttachments(job.payload?.attachments);
    } catch (error) {
      throw new ApiException(error);
    }

    return JobStatusEnum.COMPLETED;
  }
}
