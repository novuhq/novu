import { Injectable, Logger } from '@nestjs/common';
import { JobRepository, JobEntity } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestBaseMetadata,
  StepTypeEnum,
} from '@novu/shared';
import {
  DetailEnum,
  Instrument,
  getNestedValue,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '@novu/application-generic';

import { PlatformException } from '../../../../shared/utils';

const LOG_CONTEXT = 'GetDigestEvents';

@Injectable()
export abstract class GetDigestEvents {
  constructor(protected jobRepository: JobRepository, private executionLogRoute: ExecutionLogRoute) {}

  @Instrument()
  protected async filterJobs(currentJob: JobEntity, transactionId: string, jobs: JobEntity[]) {
    const digestMeta = currentJob?.digest as IDigestBaseMetadata | undefined;
    const batchValue = currentJob?.payload ? getNestedValue(currentJob.payload, digestMeta?.digestKey) : undefined;
    const filteredJobs = jobs.filter((job) => {
      return getNestedValue(job.payload, digestMeta?.digestKey) === batchValue;
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
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(currentJob),
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

    return events;
  }
}
