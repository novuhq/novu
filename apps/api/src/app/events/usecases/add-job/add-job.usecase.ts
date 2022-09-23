import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { WorkflowQueueService } from '../../services/workflow.queue.service';
import { AddDelayJob } from './add-delay-job.usecase';
import { AddDigestJob } from './add-digest-job.usecase';
import { AddJobCommand } from './add-job.command';

@Injectable()
export class AddJob {
  constructor(
    private jobRepository: JobRepository,
    private workflowQueueService: WorkflowQueueService,
    private addDigestJob: AddDigestJob,
    private addDelayJob: AddDelayJob
  ) {}

  public async execute(command: AddJobCommand): Promise<undefined> {
    const digestAdded = await this.addDigestJob.execute(command);
    const delayAdded = await this.addDelayJob.execute(command);

    if (digestAdded || delayAdded) {
      return;
    }

    const job = await this.jobRepository.findById(command.jobId);

    if (!job) {
      return;
    }

    await this.jobRepository.updateStatus(job._id, JobStatusEnum.QUEUED);
    await this.workflowQueueService.addToQueue(job._id, {
      ...job,
      presend: command.presend,
    });
  }
}
