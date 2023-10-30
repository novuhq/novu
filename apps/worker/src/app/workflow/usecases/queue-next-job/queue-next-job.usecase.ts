import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import { AddJob, FilterConditionsService, InstrumentUsecase } from '@novu/application-generic';

import { QueueNextJobCommand } from './queue-next-job.command';
import { StepTypeEnum } from '@novu/shared';

@Injectable()
export class QueueNextJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => AddJob)) private addJobUsecase: AddJob,
    private filterConditions: FilterConditionsService
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
      const shouldRun = await this.filterConditions.filter(job.step.filters || [], job.payload, {
        subscriberId: job.subscriberId,
        environmentId: job._environmentId,
      });

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
