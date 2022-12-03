import { Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { AddJobCommand } from './add-job.command';
import { AddJob } from './add-job.usecase';
import { ShouldAddDigestJob } from './should-add-digest-job.usecase';

@Injectable()
export class AddDigestJob {
  constructor(
    private jobRepository: JobRepository,
    private shouldAddDigestJob: ShouldAddDigestJob,
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  public async execute(command: AddJobCommand): Promise<number | undefined> {
    const data = await this.jobRepository.findById(command.jobId);

    const isValidDigestStep = data.type === StepTypeEnum.DIGEST && data.digest.amount && data.digest.unit;
    if (!isValidDigestStep || !data) {
      return undefined;
    }

    const shouldAddDigest = await this.shouldAddDigestJob.execute(command);

    if (!shouldAddDigest) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(data),
          detail: DetailEnum.DIGEST_MERGED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
        })
      );

      return undefined;
    }
    await this.jobRepository.updateStatus(command.organizationId, data._id, JobStatusEnum.DELAYED);

    return AddJob.toMilliseconds(data.digest.amount, data.digest.unit);
  }
}
