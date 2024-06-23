import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { JobRepository, JobStatusEnum } from '@novu/dal';
import { DelayTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import {
  ApiException,
  ComputeJobWaitDurationService,
  DetailEnum,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
  InstrumentUsecase,
} from '@novu/application-generic';

import { AddJobCommand } from './add-job.command';

@Injectable()
export class AddDelayJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => ComputeJobWaitDurationService))
    private computeJobWaitDurationService: ComputeJobWaitDurationService,
    @Inject(forwardRef(() => ExecutionLogRoute))
    private executionLogRoute: ExecutionLogRoute
  ) {}

  @InstrumentUsecase()
  public async execute(command: AddJobCommand): Promise<number | undefined> {
    const data = command.job;

    if (!data) throw new ApiException(`Job with id ${command.jobId} not found`);

    const isDelayStep = data.type === StepTypeEnum.DELAY;

    if (!data || !isDelayStep) {
      return undefined;
    }

    let delay;

    try {
      delay = this.computeJobWaitDurationService.calculateDelay({
        stepMetadata: data.step.bridgeUrl ? data.digest : data.step.metadata,
        payload: data.payload,
        overrides: data.overrides,
      });

      await this.jobRepository.updateStatus(command.environmentId, data._id, JobStatusEnum.DELAYED);
    } catch (error: any) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.DELAY_MISCONFIGURATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: error.message }),
        })
      );

      await this.jobRepository.updateStatus(command.environmentId, data._id, JobStatusEnum.CANCELED);

      throw error;
    }

    return delay;
  }
}
