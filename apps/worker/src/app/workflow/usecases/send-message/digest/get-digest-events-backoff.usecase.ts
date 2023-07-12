import { Injectable } from '@nestjs/common';
import { JobStatusEnum } from '@novu/dal';
import { IDigestRegularMetadata, StepTypeEnum } from '@novu/shared';
import { DigestFilterSteps, InstrumentUsecase } from '@novu/application-generic';

import { SendMessageCommand } from '../send-message.command';
import { GetDigestEvents } from './get-digest-events.usecase';
import { PlatformException } from '../../../../shared/utils';

@Injectable()
export class GetDigestEventsBackoff extends GetDigestEvents {
  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({ _environmentId: command.environmentId, _id: command.jobId });
    if (!currentJob) throw new PlatformException('Digest job is not found');

    const digestMeta = currentJob.digest as IDigestRegularMetadata | undefined;
    const digestKey = digestMeta?.digestKey;
    const digestValue = DigestFilterSteps.getNestedValue(currentJob.payload, digestKey);

    const jobs = await this.jobRepository.find({
      createdAt: {
        $gte: currentJob.createdAt,
      },
      _templateId: currentJob._templateId,
      status: JobStatusEnum.COMPLETED,
      type: StepTypeEnum.TRIGGER,
      _environmentId: command.environmentId,
      ...(digestKey && { [`payload.${digestKey}`]: digestValue }),
      // backward compatibility - ternary needed to be removed once the queue renewed
      _subscriberId: command._subscriberId ? command._subscriberId : command.subscriberId,
    });

    return this.filterJobs(currentJob, command.transactionId, jobs);
  }
}
