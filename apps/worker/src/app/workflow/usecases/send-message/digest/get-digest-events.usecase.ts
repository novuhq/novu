import { Injectable, Logger } from '@nestjs/common';
import { JobRepository, JobEntity } from '@novu/dal';
import {
  EnvironmentId,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  StepTypeEnum,
} from '@novu/shared';
import {
  DigestFilterSteps,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  Instrument,
} from '@novu/application-generic';

import { PlatformException } from '../../../../shared/utils';

const LOG_CONTEXT = 'GetDigestEvents';

@Injectable()
export abstract class GetDigestEvents {
  constructor(protected jobRepository: JobRepository, private createExecutionDetails: CreateExecutionDetails) {}

  protected getJobDigest(job: JobEntity): {
    digestMeta: IDigestBaseMetadata | undefined;
    digestKey: string | undefined;
    digestValue: string | undefined;
  } {
    const digestMeta = job.digest as IDigestRegularMetadata | undefined;
    const digestKey = digestMeta?.digestKey;
    const digestValue = DigestFilterSteps.getNestedValue(job.payload, digestKey);

    return {
      digestKey,
      digestMeta,
      digestValue,
    };
  }

  @Instrument()
  protected async filterJobs(currentJob: JobEntity, transactionId: string, jobs: JobEntity[]) {
    const digestMeta = currentJob?.digest as IDigestBaseMetadata | undefined;
    const batchValue = currentJob?.payload
      ? DigestFilterSteps.getNestedValue(currentJob.payload, digestMeta?.digestKey)
      : undefined;
    const filteredJobs = jobs.filter((job) => {
      return DigestFilterSteps.getNestedValue(job.payload, digestMeta?.digestKey) === batchValue;
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
      const message = `Trigger job for jobId ${currentJob._id} is not found`;
      Logger.error(message, LOG_CONTEXT);
      throw new PlatformException(message);
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
