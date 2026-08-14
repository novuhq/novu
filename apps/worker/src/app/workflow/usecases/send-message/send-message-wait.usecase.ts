import { Injectable } from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  InstrumentUsecase,
} from '@novu/application-generic';
import { JobRepository, MessageRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { SendMessageCommand } from './send-message.command';
import { SendMessageResult, SendMessageStatus, SendMessageType } from './send-message-type.usecase';

@Injectable()
export class SendMessageWait extends SendMessageType {
  constructor(
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    private readonly jobRepository: JobRepository
  ) {
    super(messageRepository, createExecutionDetails);
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand): Promise<SendMessageResult> {
    const existingStatus = command.job.stepOutput?.status;
    const result =
      existingStatus === 'resumed'
        ? command.job.stepOutput
        : {
            status: 'expired',
          };

    if (existingStatus !== 'resumed') {
      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.job._environmentId,
        },
        { $set: { stepOutput: result } }
      );
    }

    const detailsFromJob = CreateExecutionDetailsCommand.getDetailsFromJob(command.job);
    const isResumed = existingStatus === 'resumed';

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...detailsFromJob,
        detail: isResumed ? DetailEnum.STEP_RESUMED : DetailEnum.STEP_EXPIRED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
        ...(isResumed && { raw: JSON.stringify({ after: waitElapsedMs(command.job.createdAt) }) }),
      })
    );

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...detailsFromJob,
        detail: DetailEnum.STEP_COMPLETED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );

    return {
      status: SendMessageStatus.SUCCESS,
    };
  }
}

function waitElapsedMs(createdAt?: string | Date): number {
  if (!createdAt) {
    return 0;
  }

  return Math.max(0, Date.now() - new Date(createdAt).getTime());
}
