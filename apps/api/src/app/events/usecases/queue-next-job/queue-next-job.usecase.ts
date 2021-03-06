import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import { WorkflowQueueService } from '../../services/workflow.queue.service';
import { QueueNextJobCommand } from './queue-next-job.command';

@Injectable()
export class QueueNextJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => WorkflowQueueService))
    private workflowQueueService: WorkflowQueueService
  ) {}

  public async execute(command: QueueNextJobCommand): Promise<JobEntity | undefined> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _parentId: command.parentId,
    });

    if (!job) {
      return;
    }

    await this.workflowQueueService.addJob(job);

    return job;
  }
}
