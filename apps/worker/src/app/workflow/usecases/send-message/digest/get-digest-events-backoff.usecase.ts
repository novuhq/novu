import { Injectable } from '@nestjs/common';
import { getJobDigest, InstrumentUsecase } from '@novu/application-generic';

import { DigestEventsCommand } from './digest-events.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsBackoff extends GetDigestEvents {
  @InstrumentUsecase()
  public async execute(command: DigestEventsCommand) {
    const { currentJob } = command;

    const { digestKey, digestValue } = getJobDigest(currentJob);

    // Shared "triggers for this digest value" primitive (matches on the
    // persisted `digest.digestValue`, payload-independent) — same shape the
    // regular path uses.
    const jobs = await this.jobRepository.findDigestEventTriggers({
      window: { field: 'createdAt', from: new Date(currentJob.createdAt) },
      templateId: currentJob._templateId,
      environmentId: currentJob._environmentId,
      subscriberId: command._subscriberId,
      digestKey,
      digestValue,
    });

    return this.filterJobs(currentJob, currentJob.transactionId, jobs);
  }
}
