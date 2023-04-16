/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@nestjs/common';
import { sub } from 'date-fns';

import { PlatformException } from '../../../../shared/utils';
import { SendMessageCommand } from '../send-message.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsRegular extends GetDigestEvents {
  public async execute(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.jobId,
    });
    if (!currentJob) throw new PlatformException('Digest job is not found');

    const amount =
      typeof currentJob.digest?.amount === 'number'
        ? currentJob.digest.amount
        : // @ts-ignore
          parseInt(currentJob.digest?.amount, 10);
    const earliest = sub(new Date(currentJob.createdAt), {
      // @ts-ignore
      [currentJob.digest?.unit]: amount,
    });

    const jobs = await this.jobRepository.findJobsToDigest(
      earliest,
      currentJob._templateId,
      command.environmentId,
      // backward compatibility - ternary needed to be removed once the queue renewed
      command._subscriberId ? command._subscriberId : command.subscriberId
    );

    return this.filterJobs(currentJob, command.transactionId, jobs);
  }
}
