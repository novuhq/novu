/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@nestjs/common';
import { sub } from 'date-fns';
import { IDigestRegularMetadata } from '@novu/shared';
import { DigestFilterSteps, InstrumentUsecase } from '@novu/application-generic';

import { PlatformException } from '../../../../shared/utils';
import { SendMessageCommand } from '../send-message.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsRegular extends GetDigestEvents {
  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.jobId,
    });
    if (!currentJob) throw new PlatformException('Digest job is not found');

    const digestMeta = currentJob.digest as IDigestRegularMetadata | undefined;
    const amount =
      typeof digestMeta?.amount === 'number'
        ? digestMeta.amount
        : // @ts-ignore
          parseInt(digestMeta?.amount, 10);
    const earliest = sub(new Date(currentJob.createdAt), {
      // @ts-ignore
      [digestMeta?.unit]: amount,
    });

    const digestKey = digestMeta?.digestKey;
    const digestValue = DigestFilterSteps.getNestedValue(currentJob.payload, digestKey);

    const jobs = await this.jobRepository.findJobsToDigest(
      earliest,
      currentJob._templateId,
      command.environmentId,
      // backward compatibility - ternary needed to be removed once the queue renewed
      command._subscriberId ? command._subscriberId : command.subscriberId,
      digestKey,
      digestValue
    );

    return this.filterJobs(currentJob, command.transactionId, jobs);
  }
}
