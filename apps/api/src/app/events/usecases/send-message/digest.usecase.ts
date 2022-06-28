import { Injectable } from '@nestjs/common';
import { JobStatusEnum, MessageRepository, JobRepository } from '@novu/dal';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { SendMessageCommand } from './send-message.command';
import { SendMessageType } from './send-message-type.usecase';
import moment from 'moment';

@Injectable()
export class Digest extends SendMessageType {
  constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected jobRepository: JobRepository
  ) {
    super(messageRepository, createLogUsecase);
  }

  public async execute(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({
      _id: command.jobId,
    });
    const earliest = moment(currentJob.createdAt).subtract(10, 'minutes').toDate();
    const jobs = await this.jobRepository.findJobsToDigest(
      earliest,
      command.identifier,
      command.environmentId,
      command.subscriberId
    );

    const nextJob = await this.jobRepository.findOne({
      _parentId: command.jobId,
    });

    const payloads = [nextJob.payload, ...jobs.map((job) => job.payload)];
    await this.jobRepository.update(
      {
        _id: nextJob._id,
      },
      {
        $set: {
          payload: payloads,
        },
      }
    );
  }
}
