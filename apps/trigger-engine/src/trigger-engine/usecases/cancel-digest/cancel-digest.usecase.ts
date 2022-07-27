import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { CancelDigestCommand } from './cancel-digest.command';

@Injectable()
export class CancelDigest {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: CancelDigestCommand): Promise<boolean> {
    const job = await this.jobRepository.findOne({
      type: ChannelTypeEnum.DIGEST,
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
