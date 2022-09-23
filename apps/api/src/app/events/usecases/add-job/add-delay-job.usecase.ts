import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { DigestUnitEnum, StepTypeEnum, DelayTypeEnum } from '@novu/shared';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { AddJobCommand } from './add-job.command';
import { differenceInMilliseconds } from 'date-fns';
import { AddJob } from './add-job.usecase';

@Injectable()
export class AddDelayJob {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: AddJobCommand): Promise<number | undefined> {
    const data = await this.jobRepository.findById(command.jobId);
    const isDelayStep = data.type === StepTypeEnum.DELAY;

    if (!data || !isDelayStep) {
      return undefined;
    }

    await this.jobRepository.updateStatus(data._id, JobStatusEnum.DELAYED);

    return this.calculateDelayAmount(data);
  }

  private checkValidDelayOverride(data: JobEntity): boolean {
    if (!data.overrides?.delay) {
      return false;
    }
    const values = Object.values(DigestUnitEnum);

    return (
      typeof data.overrides.delay.amount === 'number' &&
      values.includes(data.overrides.delay.unit as unknown as DigestUnitEnum)
    );
  }

  private calculateDelayAmount(data: JobEntity): number {
    if (data.step.metadata.type === DelayTypeEnum.SCHEDULED) {
      const delayPath = data.step.metadata.delayPath;
      const delayDate = data.payload[delayPath];
      const delay = differenceInMilliseconds(new Date(delayDate), new Date());

      if (delay < 0) {
        throw new ApiException(`Delay date at path ${delayPath} must be a future date`);
      }

      return delay;
    }

    if (this.checkValidDelayOverride(data)) {
      return AddJob.toMilliseconds(data.overrides.delay.amount as number, data.overrides.delay.unit as DigestUnitEnum);
    }

    return AddJob.toMilliseconds(data.step.metadata.amount, data.step.metadata.unit);
  }
}
