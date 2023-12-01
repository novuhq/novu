import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import { AddJob, ConditionsFilter, ConditionsFilterCommand, InstrumentUsecase } from '@novu/application-generic';

import { QueueNextJobCommand } from './queue-next-job.command';
import { StepTypeEnum } from '@novu/shared';

@Injectable()
export class QueueNextJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => AddJob)) private addJobUsecase: AddJob,
    private conditionsFilter: ConditionsFilter
  ) {}

  @InstrumentUsecase()
  public async execute(command: QueueNextJobCommand): Promise<JobEntity | undefined> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.parentId,
    });

    if (!job) {
      return;
    }

    let filtered = false;

    if ([StepTypeEnum.DELAY, StepTypeEnum.DIGEST].includes(job.type as StepTypeEnum)) {
      const shouldRun = await this.conditionsFilter.filter(
        ConditionsFilterCommand.create({
          filters: job.step.filters || [],
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        })
      );

      filtered = !shouldRun.passed;
    }

    await this.addJobUsecase.execute({
      userId: job._userId,
      environmentId: job._environmentId,
      organizationId: command.organizationId,
      jobId: job._id,
      job,
      filtered,
    });

    return job;
  }
}
