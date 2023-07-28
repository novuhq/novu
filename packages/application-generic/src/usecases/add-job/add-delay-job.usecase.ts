import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';

import { ApiException } from '../../utils/exceptions';
import { AddJobCommand } from './add-job.command';
import { CalculateDelayService } from '../../services';
import { InstrumentUsecase } from '../../instrumentation';

@Injectable()
export class AddDelayJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => CalculateDelayService))
    private calculateDelayService: CalculateDelayService
  ) {}

  @InstrumentUsecase()
  public async execute(command: AddJobCommand): Promise<number | undefined> {
    const data =
      command.job ?? (await this.jobRepository.findById(command.jobId));

    if (!data) throw new ApiException(`Job with id ${command.jobId} not found`);

    const isDelayStep = data.type === StepTypeEnum.DELAY;

    if (!data || !isDelayStep) {
      return undefined;
    }

    await this.jobRepository.updateStatus(
      command.environmentId,
      data._id,
      JobStatusEnum.DELAYED
    );

    return this.calculateDelayService.calculateDelay({
      stepMetadata: data.step.metadata,
      payload: data.payload,
      overrides: data.overrides,
    });
  }
}
