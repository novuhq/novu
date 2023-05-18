import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatusEnum, JobRepository } from '@novu/dal';
import { isBefore } from 'date-fns';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ResumeDelayedCommand } from './resume-delayed.command';

@Injectable()
export class ResumeDelayed {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: ResumeDelayedCommand): Promise<void> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      transactionId: command.transactionId,
      status: JobStatusEnum.CANCELED,
    });

    if (!job) {
      throw new NotFoundException(`Job with transactionId ${command.transactionId} was not found`);
    }

    if (isBefore(new Date(job?.expireAt as string), new Date())) {
      throw new ApiException(`Job ${command.transactionId} can not be resumed as it has expired`);
    }

    const { matched, modified } = await this.jobRepository.update(
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

    if (matched === 0 || modified === 0) {
      throw new ApiException(`Something went wrong resuming Job with transactionId ${command.transactionId}`);
    }

    return;
  }
}
