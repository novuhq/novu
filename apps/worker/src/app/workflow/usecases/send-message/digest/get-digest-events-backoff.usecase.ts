import { Injectable } from '@nestjs/common';
import { JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { InstrumentUsecase } from '@novu/application-generic';

import { DigestEventsCommand } from './digest-events.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsBackoff extends GetDigestEvents {
  @InstrumentUsecase()
  public async execute(command: DigestEventsCommand) {
    const activeDigestJob = command.currentJob;

    const jobs = await this.jobRepository.find(
      {
        _mergedDigestId: activeDigestJob._id,
        status: JobStatusEnum.MERGED,
        type: StepTypeEnum.DIGEST,
        _environmentId: activeDigestJob._environmentId,
        _subscriberId: command._subscriberId,
      },
      'payload'
    );

    return [activeDigestJob.payload, ...jobs.map((job) => job.payload)];
  }
}
