import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { JobEntity, JobRepository } from '@novu/dal';
import { AddJob } from '../add-job';
import { QueueNextJobCommand } from './queue-next-job.command';

@Injectable()
export class QueueNextJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => AddJob)) private addJobUsecase: AddJob,
    // private workflowStatusUpdateService: WorkflowRunService
  ) {}

  @InstrumentUsecase()
  public async execute(command: QueueNextJobCommand): Promise<JobEntity | undefined> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.parentId,
    });

    if (!job) {
      // await this.workflowStatusUpdateService.updateDeliveryLifecycle({
      //   notificationId: command.parentId,
      //   environmentId: command.environmentId,
      //   organizationId: command.organizationId,
      //   subscriberId: command.subscriberId,
      // });

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
