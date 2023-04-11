import { Injectable } from '@nestjs/common';
import { JobRepository, JobEntity } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import {
  DigestFilterSteps,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '@novu/application-generic';

import { PlatformException } from '../../../../shared/utils';

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

    const currentTrigger = (await this.jobRepository.findOne(
      {
        _environmentId: currentJob._environmentId,
        _subscriberId: currentJob._subscriberId,
        transactionId: transactionId,
        type: StepTypeEnum.TRIGGER,
      },
      '_id'
    )) as Pick<JobEntity, '_id'>;

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
      throw new PlatformException('Trigger job is not found');
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
