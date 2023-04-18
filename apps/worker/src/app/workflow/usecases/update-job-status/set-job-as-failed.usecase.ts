import { Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';

import { SetJobAsFailedCommand } from './set-job-as.command';
import { UpdateJobStatusCommand } from './update-job-status.command';
import { UpdateJobStatus } from './update-job-status.usecase';

@Injectable()
export class SetJobAsFailed {
  constructor(private updateJobStatus: UpdateJobStatus, private jobRepository: JobRepository) {}

  public async execute(command: SetJobAsFailedCommand, error: Error): Promise<void> {
    await this.updateJobStatus.execute(
      UpdateJobStatusCommand.create({
        environmentId: command.environmentId,
        _jobId: command._jobId,
        organizationId: command.organizationId,
        status: JobStatusEnum.FAILED,
      })
    );
    await this.jobRepository.setError(command.organizationId, command._jobId, error);
  }
}
