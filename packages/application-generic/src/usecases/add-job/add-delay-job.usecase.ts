import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';

import { ApiException } from '../../utils/exceptions';
import { AddJobCommand } from './add-job.command';
import {
  CalculateDelayService,
  ExecutionLogQueueService,
} from '../../services';
import { InstrumentUsecase } from '../../instrumentation';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../create-execution-details';

@Injectable()
export class AddDelayJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => CalculateDelayService))
    private calculateDelayService: CalculateDelayService,
    @Inject(forwardRef(() => ExecutionLogQueueService))
    private executionLogQueueService: ExecutionLogQueueService
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
      });

      await this.jobRepository.updateStatus(
        command.environmentId,
        data._id,
        JobStatusEnum.DELAYED
      );
    } catch (error: any) {
      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();

      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.DELAY_MISCONFIGURATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: error.message }),
        }),
        command.organizationId
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
