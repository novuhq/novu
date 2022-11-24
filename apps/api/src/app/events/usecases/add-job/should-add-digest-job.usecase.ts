import { Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { AddJobCommand } from './add-job.command';

@Injectable()
export class ShouldAddDigestJob {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: AddJobCommand): Promise<boolean> {
    const data = await this.jobRepository.findById(command.jobId);

    const isValidDigestStep = data.type === StepTypeEnum.DIGEST && data.digest.amount && data.digest.unit;
    if (!isValidDigestStep || !data) {
      return true;
    }

    const delayedDigest = await this.jobRepository.findOne({
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: data._subscriberId,
      _templateId: data._templateId,
      _environmentId: data._environmentId,
    });

    return !delayedDigest;
  }
}
