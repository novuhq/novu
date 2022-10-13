import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { WorkflowQueueService } from '../../services/workflow.queue.service';
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
    private queueNextJob: QueueNextJob
  ) {}

  public async execute(command: RunJobCommand): Promise<JobEntity | undefined> {
    const job = await this.jobRepository.findById(command.jobId);
    const canceled = await this.delayedEventIsCanceled(job);
    if (canceled) {
      return;
    }

    await this.jobRepository.updateStatus(job._id, JobStatusEnum.RUNNING);

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

    await this.queueNextJob.execute(
      QueueNextJobCommand.create({
        parentId: job._id,
        environmentId: job._environmentId,
        organizationId: job._organizationId,
        userId: job._userId,
      })
    );
  }

  private async delayedEventIsCanceled(job: JobEntity): Promise<boolean> {
    if (job.type !== StepTypeEnum.DIGEST && job.type !== StepTypeEnum.DELAY) {
      return false;
    }
    const count = await this.jobRepository.count({
      _id: job._id,
      status: JobStatusEnum.CANCELED,
    });

    return count > 0;
  }
}
