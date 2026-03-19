import { Injectable } from '@nestjs/common';
import {
  InstrumentUsecase,
  StepRunRepository,
  WorkflowRunService,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';

import { SetJobAsFailedCommand } from './set-job-as.command';
import { UpdateJobStatusCommand } from './update-job-status.command';
import { UpdateJobStatus } from './update-job-status.usecase';

@Injectable()
export class SetJobAsFailed {
  constructor(
    private updateJobStatus: UpdateJobStatus,
    private jobRepository: JobRepository,
    private workflowRunService: WorkflowRunService,
    private stepRunRepository: StepRunRepository
  ) {}

  @InstrumentUsecase()
  public async execute(command: SetJobAsFailedCommand, error: Error): Promise<JobEntity | null> {
    const jobEntity = await this.updateJobStatus.execute(
      UpdateJobStatusCommand.create({
        environmentId: command.environmentId,
        jobId: command.jobId,
        status: JobStatusEnum.FAILED,
      })
    );

    if (!jobEntity) {
      return null;
    }

    await this.jobRepository.setError(command.organizationId, command.jobId, error);

    await this.stepRunRepository.create(jobEntity, {
      status: JobStatusEnum.FAILED,
      errorCode: 'job_failed',
      errorMessage: error.message,
    });

    await this.workflowRunService.updateDeliveryLifecycle({
      notificationId: jobEntity._notificationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      _subscriberId: jobEntity._subscriberId,
      workflowStatus: command.isLastJobFailed ? WorkflowRunStatusEnum.COMPLETED : WorkflowRunStatusEnum.PROCESSING,
      currentJob: { type: jobEntity.type, _id: jobEntity._id },
    });

    return jobEntity;
  }
}
