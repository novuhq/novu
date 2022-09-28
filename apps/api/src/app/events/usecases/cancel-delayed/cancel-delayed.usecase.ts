import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository } from '@novu/dal';
import { CancelDelayedCommand } from './cancel-delayed.command';

@Injectable()
export class CancelDelayed {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: CancelDelayedCommand): Promise<boolean> {
    const job = await this.jobRepository.findOne({
      transactionId: command.transactionId,
      status: JobStatusEnum.DELAYED,
    });

    if (!job) {
      return false;
    }

    await this.jobRepository.update(
      {
        _id: job._id,
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
