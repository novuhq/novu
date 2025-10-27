import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { JobEntity, JobRepository } from '@novu/dal';

import { UpdateJobStatusCommand } from './update-job-status.command';

@Injectable()
export class UpdateJobStatus {
  constructor(private jobRepository: JobRepository) {}

  @InstrumentUsecase()
  public async execute(command: UpdateJobStatusCommand): Promise<JobEntity | null> {
    return this.jobRepository.updateStatus(command.environmentId, command.jobId, command.status);
  }
}
