import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ResumeDelayedCommand } from './resume-delayed.command';

@Injectable()
export class ResumeDelayed {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: ResumeDelayedCommand): Promise<boolean> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      transactionId: command.transactionId,
      status: JobStatusEnum.CANCELED,
    });

    if (!job) {
      return false;
    }

    if (new Date(job?.expireAt as string) < new Date()) {
      throw new ApiException(`Job ${command.transactionId} can not be resumed as it has expired`);
    }

    await this.jobRepository.update(
      {
        _environmentId: command.environmentId,
        _id: job._id,
      },
      {
        $set: {
          status: JobStatusEnum.DELAYED,
        },
      }
    );

    return true;
  }
}
