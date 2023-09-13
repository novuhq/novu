import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import { AddJob, InstrumentUsecase } from '@novu/application-generic';

import { QueueNextJobCommand } from './queue-next-job.command';

@Injectable()
export class QueueNextJob {
  constructor(private jobRepository: JobRepository, @Inject(forwardRef(() => AddJob)) private addJobUsecase: AddJob) {}

  @InstrumentUsecase()
  public async execute(command: QueueNextJobCommand): Promise<JobEntity | undefined> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.parentId,
    });

    if (!job) {
      return;
    }

    await this.addJobUsecase.execute({
      userId: job._userId,
      environmentId: job._environmentId,
      organizationId: command.organizationId,
      jobId: job._id,
      job,
    });

    return job;
  }
}
