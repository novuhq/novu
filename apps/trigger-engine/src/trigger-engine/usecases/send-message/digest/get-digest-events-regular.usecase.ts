import { Injectable } from '@nestjs/common';
import { SendMessageCommand } from '../send-message.command';
import * as moment from 'moment';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsRegular extends GetDigestEvents {
  public async execute(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({
      _id: command.jobId,
    });
    const amount =
      typeof currentJob?.digest.amount === 'number'
        ? currentJob?.digest.amount
        : parseInt(currentJob.digest.amount, 10);
    const earliest = moment()
      .subtract(amount, currentJob.digest.unit as moment.unitOfTime.DurationConstructor)
      .toDate();

    const jobs = await this.jobRepository.findJobsToDigest(
      earliest,
      currentJob._templateId,
      command.environmentId,
      command.subscriberId
    );

    return this.filterJobs(currentJob, command.transactionId, jobs);
  }
}
