import { Injectable } from '@nestjs/common';
import { JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { getJobDigest, InstrumentUsecase } from '@novu/application-generic';

import { DigestEventsCommand } from './digest-events.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsBackoff extends GetDigestEvents {
  @InstrumentUsecase()
  public async execute(command: DigestEventsCommand) {
    const currentJob = command.currentJob;

    const { digestKey, digestMeta, digestValue } = getJobDigest(currentJob);

    const jobs = await this.jobRepository.find(
      {
        createdAt: {
          $gte: currentJob.createdAt,
        },
        _templateId: currentJob._templateId,
        status: JobStatusEnum.COMPLETED,
        type: StepTypeEnum.TRIGGER,
        _environmentId: currentJob._environmentId,
        ...(digestKey && { [`payload.${digestKey}`]: digestValue }),
        _subscriberId: command._subscriberId,
      },
      'payload _id'
    );

    return this.filterJobs(currentJob, currentJob.transactionId, jobs);
  }
}
