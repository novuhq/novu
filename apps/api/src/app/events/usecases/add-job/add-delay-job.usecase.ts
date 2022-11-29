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

    await this.jobRepository.updateStatus(command.organizationId, data._id, JobStatusEnum.DELAYED);

    return await this.calculateDelayAmount(data);
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

  private async calculateDelayAmount(data: JobEntity): Promise<number> {
    if (data.step.metadata.type === DelayTypeEnum.SCHEDULED) {
      const delayPath = data.step.metadata.delayPath;
      const delayDate = data.payload[delayPath];

      const delay = differenceInMilliseconds(new Date(delayDate), new Date());

      if (delay < 0) {
        throw new ApiException(`Delay date at path ${delayPath} must be a future date`);
      }

      const noiIdenticalDelay = await this.noExistingDelayedJobForDate(data, delayPath, delayDate);

      if (noiIdenticalDelay) {
        return delay;
      }

      return delay + 1000;
    }

    if (this.checkValidDelayOverride(data)) {
      return AddJob.toMilliseconds(data.overrides.delay.amount as number, data.overrides.delay.unit as DigestUnitEnum);
    }

    return AddJob.toMilliseconds(data.step.metadata.amount, data.step.metadata.unit);
  }

  /**
   * To handle case of Scheduled Delay (triggered multiple times with the exact same future date) followed by a Digest.
   * To avoid duplicate pending digests which would result in duplicate messages sent.
   */
  private async noExistingDelayedJobForDate(
    data: JobEntity,
    currDelayPath: string,
    currDelayDate: string
  ): Promise<boolean> {
    return !(await this.jobRepository.findOne({
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DELAY,
      _subscriberId: data._subscriberId,
      _templateId: data._templateId,
      _environmentId: data._environmentId,
      transactionId: { $ne: data.transactionId },
      'step.metadata.type': DelayTypeEnum.SCHEDULED,
      'step.metadata.delayPath': currDelayPath,
      [`payload.${currDelayPath}`]: currDelayDate,
    }));
  }
}
