import { Injectable } from '@nestjs/common';
import { JobStatusEnum } from '@novu/dal';
import { SendMessageCommand } from '../send-message.command';
import { StepTypeEnum } from '@novu/shared';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsBackoff extends GetDigestEvents {
  public async execute(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({ _environmentId: command.environmentId, _id: command.jobId });

    const jobs = await this.jobRepository.find({
      createdAt: {
        $gte: currentJob.createdAt,
      },
      _templateId: currentJob._templateId,
      status: JobStatusEnum.COMPLETED,
      type: StepTypeEnum.TRIGGER,
      _environmentId: command.environmentId,
      _subscriberId: command.subscriberId,
    });

    return this.filterJobs(currentJob, command.transactionId, jobs);
  }
}
