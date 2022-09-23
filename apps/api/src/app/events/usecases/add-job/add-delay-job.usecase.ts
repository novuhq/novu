import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { DigestUnitEnum, StepTypeEnum, DelayTypeEnum } from '@novu/shared';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { WorkflowQueueService } from '../../services/workflow.queue.service';
import { AddJobCommand } from './add-job.command';
import { differenceInMilliseconds } from 'date-fns';

@Injectable()
export class AddDelayJob {
  constructor(private jobRepository: JobRepository, private workflowQueueService: WorkflowQueueService) {}

  public async execute(command: AddJobCommand): Promise<boolean> {
    const data = await this.jobRepository.findById(command.jobId);

    if (!data) {
      return false;
    }

    const isDelayStep = data.type === StepTypeEnum.DELAY;

    if (!isDelayStep) {
      return false;
    }

    await this.jobRepository.updateStatus(data._id, JobStatusEnum.DELAYED);

    const delay = this.calculateDelayAmount(data);

    await await this.workflowQueueService.addToQueue(data._id, data, delay);

    return true;
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
      return WorkflowQueueService.toMilliseconds(
        data.overrides.delay.amount as number,
        data.overrides.delay.unit as DigestUnitEnum
      );
    }

    return WorkflowQueueService.toMilliseconds(data.step.metadata.amount, data.step.metadata.unit);
  }
}
