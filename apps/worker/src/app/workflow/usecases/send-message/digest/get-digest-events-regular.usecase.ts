import { Injectable } from '@nestjs/common';
import { sub } from 'date-fns';
import { getJobDigest, InstrumentUsecase } from '@novu/application-generic';
import { IDigestBaseMetadata } from '@novu/shared';

import { DigestEventsCommand } from './digest-events.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsRegular extends GetDigestEvents {
  @InstrumentUsecase()
  public async execute(command: DigestEventsCommand) {
    const { currentJob } = command;

    const { digestKey, digestMeta, digestValue } = getJobDigest(currentJob);
    const amount = this.castAmount(digestMeta);
    const unit = digestMeta?.unit;

    const subtractedTime =
      digestMeta && unit
        ? {
            [unit]: amount,
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

  private castAmount(digestMeta: IDigestBaseMetadata | undefined): number | undefined {
    let amount: number | undefined;

    if (typeof digestMeta?.amount === 'number') {
      amount = digestMeta.amount;
    }

    if (typeof digestMeta?.amount === 'string') {
      amount = parseInt(digestMeta.amount, 10);
    }

    return amount;
  }
}
