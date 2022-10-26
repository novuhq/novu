import { Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum, DigestUnitEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { WorkflowQueueService } from '../../services/workflow.queue.service';
import { AddDelayJob } from './add-delay-job.usecase';
import { AddDigestJob } from './add-digest-job.usecase';
import { AddJobCommand } from './add-job.command';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';

@Injectable()
export class AddJob {
  constructor(
    private jobRepository: JobRepository,
    private workflowQueueService: WorkflowQueueService,
    private createExecutionDetails: CreateExecutionDetails,
    private addDigestJob: AddDigestJob,
    private addDelayJob: AddDelayJob
  ) {}

  public async execute(command: AddJobCommand): Promise<void> {
    const digestAmount = await this.addDigestJob.execute(command);
    const delayAmount = await this.addDelayJob.execute(command);

    const job = await this.jobRepository.findById(command.jobId);

    if (!job) {
      return;
    }

    if (job.type === StepTypeEnum.DIGEST && digestAmount === undefined) {
      return;
    }

    if (digestAmount === undefined && delayAmount == undefined) {
      await this.jobRepository.updateStatus(job._id, JobStatusEnum.QUEUED);
    }

    const delay = digestAmount ?? delayAmount;

    this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.STEP_QUEUED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );

    await this.workflowQueueService.addToQueue(job._id, job, delay);
  }

  public static toMilliseconds(amount: number, unit: DigestUnitEnum): number {
    let delay = 1000 * amount;
    if (unit === DigestUnitEnum.DAYS) {
      delay = 60 * 60 * 24 * delay;
    }
    if (unit === DigestUnitEnum.HOURS) {
      delay = 60 * 60 * delay;
    }
    if (unit === DigestUnitEnum.MINUTES) {
      delay = 60 * delay;
    }

    return delay;
  }
}
