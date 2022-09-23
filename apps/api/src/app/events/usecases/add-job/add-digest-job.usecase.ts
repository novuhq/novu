import { Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { AddJobCommand } from './add-job.command';
import { AddJob } from './add-job.usecase';

@Injectable()
export class AddDigestJob {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: AddJobCommand): Promise<number | undefined> {
    const data = await this.jobRepository.findById(command.jobId);

    const isValidDigestStep = data.type === StepTypeEnum.DIGEST && data.digest.amount && data.digest.unit;
    if (!isValidDigestStep || !data) {
      return undefined;
    }

    await this.jobRepository.updateStatus(data._id, JobStatusEnum.DELAYED);

    return AddJob.toMilliseconds(data.digest.amount, data.digest.unit);
  }
}
