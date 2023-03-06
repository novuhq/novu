import { Injectable } from '@nestjs/common';
import { JobRepository, JobEntity } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';

import { ApiException } from '../../../../shared/exceptions/api.exception';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { CreateExecutionDetails } from '../../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { DigestFilterSteps } from '../../digest-filter-steps/digest-filter-steps.usecase';

@Injectable()
export abstract class GetDigestEvents {
  constructor(protected jobRepository: JobRepository, private createExecutionDetails: CreateExecutionDetails) {}

  protected async filterJobs(currentJob: JobEntity, transactionId: string, jobs: JobEntity[]) {
    const batchValue = currentJob?.payload
      ? DigestFilterSteps.getNestedValue(currentJob.payload, currentJob?.digest?.digestKey)
      : undefined;
    const filteredJobs = jobs.filter((job) => {
      return DigestFilterSteps.getNestedValue(job.payload, currentJob.digest?.digestKey) === batchValue;
    });

    const currentTrigger = await this.jobRepository.findOne({
      _environmentId: currentJob._environmentId,
      transactionId: transactionId,
      type: StepTypeEnum.TRIGGER,
    });
    if (!currentTrigger) {
      this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(currentJob),
          detail: DetailEnum.DIGEST_TRIGGERED_EVENTS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );
      throw new ApiException('Trigger job is not found');
    }

    const events = [
      currentJob.payload,
      ...filteredJobs.filter((job) => job._id !== currentTrigger._id).map((job) => job.payload),
    ];

    this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(currentJob),
        detail: DetailEnum.DIGEST_TRIGGERED_EVENTS,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(events),
      })
    );

    return events;
  }
}
