import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import { JobRepository, JobStatusEnum } from '@novu/dal';
import {
  DelayTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';

import { ApiException } from '../../utils/exceptions';
import { AddJobCommand } from './add-job.command';
import { CalculateDelayService } from '../../services';
import { InstrumentUsecase } from '../../instrumentation';
import { DetailEnum } from '../create-execution-details';
import {
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '../execution-log-route';

@Injectable()
export class AddDelayJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => CalculateDelayService))
    private calculateDelayService: CalculateDelayService,
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
      delay = this.calculateDelayService.calculateDelay({
        stepMetadata: data.step.metadata,
        payload: data.payload,
        overrides: data.overrides,
        // TODO: Remove fallback after other delay types are implemented.
        chimeraResponse: command.chimeraResponse?.outputs
          ? {
              type: DelayTypeEnum.REGULAR,
              ...command.chimeraResponse?.outputs,
            }
          : undefined,
      });

      await this.jobRepository.updateStatus(
        command.environmentId,
        data._id,
        JobStatusEnum.DELAYED
      );
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

      await this.jobRepository.updateStatus(
        command.environmentId,
        data._id,
        JobStatusEnum.CANCELED
      );

      throw error;
    }

    return delay;
  }
}
