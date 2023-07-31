import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatusEnum, JobRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ResumeDelayedCommand } from './resume-delayed.command';
import { CalculateDelayService } from '@novu/application-generic';

@Injectable()
export class ResumeDelayed {
  constructor(private jobRepository: JobRepository, private calculateDelayService: CalculateDelayService) {}

  public async execute(command: ResumeDelayedCommand): Promise<void> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      transactionId: command.transactionId,
      status: JobStatusEnum.CANCELED,
    });

    if (!job) {
      throw new NotFoundException(`Job with transactionId ${command.transactionId} was not found`);
    }

    // Will throw an exception if the calculation of the delay doesn't pass.
    this.calculateDelayService.calculateDelay({
      stepMetadata: job.step.metadata,
      payload: job.payload,
      overrides: job.overrides,
    });

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
