import { Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { InstrumentUsecase } from '@novu/application-generic';

import { SetJobAsFailedCommand } from './set-job-as.command';
import { UpdateJobStatusCommand } from './update-job-status.command';
import { UpdateJobStatus } from './update-job-status.usecase';

@Injectable()
export class SetJobAsFailed {
  constructor(private updateJobStatus: UpdateJobStatus, private jobRepository: JobRepository) {}

  @InstrumentUsecase()
  public async execute(command: SetJobAsFailedCommand, error: Error): Promise<void> {
    await this.updateJobStatus.execute(
      UpdateJobStatusCommand.create({
        environmentId: command.environmentId,
        jobId: command.jobId,
        status: JobStatusEnum.FAILED,
      })
    );
    await this.jobRepository.setError(command.organizationId, command.jobId, error);
  }
}
