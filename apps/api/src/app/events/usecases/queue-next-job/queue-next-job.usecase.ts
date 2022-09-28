import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import { AddJob } from '../add-job/add-job.usecase';
import { QueueNextJobCommand } from './queue-next-job.command';

@Injectable()
export class QueueNextJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => AddJob))
    private addJobUsecase: AddJob
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

    await this.addJobUsecase.execute({
      userId: job._userId,
      environmentId: job._environmentId,
      organizationId: job._organizationId,
      jobId: job._id,
    });

    return job;
  }
}
