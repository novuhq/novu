import { Injectable, Logger } from '@nestjs/common';
import {
  buildDigestEvent,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  Instrument,
} from '@novu/application-generic';
import { JobEntity, JobRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';

import { PlatformException } from '../../../../shared/utils';

const LOG_CONTEXT = 'GetDigestEvents';

@Injectable()
export abstract class GetDigestEvents {
  constructor(
    protected jobRepository: JobRepository,
    private createExecutionDetails: CreateExecutionDetails
  ) {}

  @Instrument()
  protected async filterJobs(currentJob: JobEntity, transactionId: string, jobs: JobEntity[]) {
    // Candidate triggers are already narrowed to this digest value by
    // `findDigestEventTriggers` (payload-independent match on the persisted
    // `digest.digestValue`), so no further payload-based filtering is needed.
    const currentTrigger = (await this.jobRepository.findOne(
      {
        _environmentId: currentJob._environmentId,
        _subscriberId: currentJob._subscriberId,
        transactionId,
        type: StepTypeEnum.TRIGGER,
      },
      '_id'
    )) as Pick<JobEntity, '_id'>;

    if (!currentTrigger) {
      await this.createExecutionDetails.execute(
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
      Logger.log(message, LOG_CONTEXT);
      throw new PlatformException(message);
    }

    const events = [currentJob, ...jobs.filter((job) => job._id !== currentTrigger._id)].map(buildDigestEvent);

    return events;
  }
}
