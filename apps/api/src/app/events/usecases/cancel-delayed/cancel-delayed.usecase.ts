import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository } from '@novu/dal';
import { CancelDelayedCommand } from './cancel-delayed.command';

@Injectable()
export class CancelDelayed {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: CancelDelayedCommand): Promise<boolean> {
    const jobs = await this.jobRepository.find(
      {
        _environmentId: command.environmentId,
        transactionId: command.transactionId,
        status: JobStatusEnum.DELAYED,
      },
      '_id'
    );

    if (!jobs?.length) {
      return false;
    }

    await this.jobRepository.update(
      {
        _environmentId: command.environmentId,
        _id: {
          $in: jobs.map((job) => job._id),
        },
      },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
        },
      }
    );

    return true;
  }
}
