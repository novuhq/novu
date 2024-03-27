/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@nestjs/common';
import { sub } from 'date-fns';
import { getJobDigest, InstrumentUsecase } from '@novu/application-generic';

import { DigestEventsCommand } from './digest-events.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsRegular extends GetDigestEvents {
  @InstrumentUsecase()
  public async execute(command: DigestEventsCommand) {
    const currentJob = command.currentJob;

    const { digestKey, digestMeta, digestValue } = getJobDigest(currentJob);

    const amount = digestMeta
      ? typeof digestMeta.amount === 'number'
        ? digestMeta.amount
        : parseInt(digestMeta.amount, 10)
      : undefined;

    const subtractedTime = digestMeta
      ? {
          [digestMeta.unit]: amount,
        }
      : {};
    const earliest = sub(new Date(currentJob.createdAt), subtractedTime);

    const jobs = await this.jobRepository.findJobsToDigest(
      earliest,
      currentJob._templateId,
      currentJob._environmentId,
      command._subscriberId,
      digestKey,
      digestValue
    );

    return this.filterJobs(currentJob, currentJob.transactionId, jobs);
  }
}
