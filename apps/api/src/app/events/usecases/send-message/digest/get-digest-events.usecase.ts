import { Injectable } from '@nestjs/common';
import { JobRepository, JobEntity } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { CreateExecutionDetails } from '../../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';

@Injectable()
export abstract class GetDigestEvents {
  constructor(protected jobRepository: JobRepository, private createExecutionDetails: CreateExecutionDetails) {}

  protected async filterJobs(currentJob: JobEntity, transactionId: string, jobs: JobEntity[]) {
    const batchValue = currentJob?.payload ? currentJob.payload[currentJob?.digest?.digestKey] : undefined;
    if (batchValue) {
      jobs = jobs.filter((job) => {
        return job.payload[currentJob.digest.digestKey] === batchValue;
      });
    }

    const currentTrigger = await this.jobRepository.findOne({
      _environmentId: currentJob._environmentId,
      transactionId: transactionId,
      type: StepTypeEnum.TRIGGER,
    });

    const events = [
      currentJob.payload,
      ...jobs.filter((job) => job._id !== currentTrigger._id).map((job) => job.payload),
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
