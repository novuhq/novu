import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository } from '@novu/dal';
import { CancelDelayedCommand } from './cancel-delayed.command';
import { WorkflowQueueService } from '../../services/workflow-queue/workflow.queue.service';
@Injectable()
export class CancelDelayed {
  constructor(private jobRepository: JobRepository, private workflowQueueService: WorkflowQueueService) {}

  public async execute(command: CancelDelayedCommand): Promise<boolean> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      transactionId: command.transactionId,
      status: JobStatusEnum.QUEUED,
      delay: { $gt: 0 },
    });

    if (!job) {
      return false;
    }

    await this.jobRepository.update(
      { _environmentId: command.environmentId, _id: job._id },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
        },
      }
    );
    await this.workflowQueueService.removeJob(job._id);

    return true;
  }
}
