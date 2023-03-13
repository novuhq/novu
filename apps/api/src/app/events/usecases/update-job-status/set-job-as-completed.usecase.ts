import { Injectable } from '@nestjs/common';
import { JobStatusEnum } from '@novu/dal';

import { SetJobAsCommand } from './set-job-as.command';
import { UpdateJobStatusCommand } from './update-job-status.command';
import { UpdateJobStatus } from './update-job-status.usecase';

@Injectable()
export class SetJobAsCompleted {
  constructor(private updateJobStatus: UpdateJobStatus) {}

  public async execute(command: SetJobAsCommand): Promise<void> {
    await this.updateJobStatus.execute(
      UpdateJobStatusCommand.create({
        environmentId: command.environmentId,
        _jobId: command._jobId,
        organizationId: command.organizationId,
        status: JobStatusEnum.COMPLETED,
      })
    );
  }
}
