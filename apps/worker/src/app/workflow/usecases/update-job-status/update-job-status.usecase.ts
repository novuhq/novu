import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, StepRunV2Writer } from '@novu/application-generic';
import { JobEntity, JobRepository } from '@novu/dal';

import { UpdateJobStatusCommand } from './update-job-status.command';

@Injectable()
export class UpdateJobStatus {
  constructor(
    private jobRepository: JobRepository,
    private stepRunV2Writer: StepRunV2Writer
  ) {}

  @InstrumentUsecase()
  public async execute(command: UpdateJobStatusCommand): Promise<JobEntity | null> {
    const updatedJob = await this.jobRepository.updateStatus(command.environmentId, command.jobId, command.status);
    this.stepRunV2Writer.write(updatedJob);

    return updatedJob;
  }
}
