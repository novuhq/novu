import { Injectable } from '@nestjs/common';
import { sub } from 'date-fns';
import { DigestUnitEnum } from '@novu/shared';

import { ApiException } from '../../../../shared/exceptions/api.exception';
import { SendMessageCommand } from '../send-message.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsRegular extends GetDigestEvents {
  public async execute(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.jobId,
    });
    if (!currentJob) throw new ApiException('Digest job is not found');

    const amount =
      typeof currentJob.digest?.amount === 'number'
        ? currentJob.digest.amount
        : parseInt(currentJob.digest?.amount ?? '0', 10);
    const earliest = sub(new Date(currentJob.createdAt), {
      [currentJob.digest?.unit ?? DigestUnitEnum.MINUTES]: amount,
    });

    const jobs = await this.jobRepository.findJobsToDigest(
      earliest,
      currentJob._templateId,
      command.environmentId,
      command.subscriberId
    );

    return this.filterJobs(currentJob, command.transactionId, jobs);
  }
}
