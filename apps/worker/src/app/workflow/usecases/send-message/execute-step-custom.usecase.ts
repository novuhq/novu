import { Injectable } from '@nestjs/common';
import { CreateExecutionDetails, InstrumentUsecase } from '@novu/application-generic';
import { JobRepository, MessageRepository } from '@novu/dal';

import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus, SendMessageType } from './send-message-type.usecase';

@Injectable()
export class ExecuteStepCustom extends SendMessageType {
  constructor(
    private jobRepository: JobRepository,
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails
  ) {
    super(messageRepository, createExecutionDetails);
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageChannelCommand): Promise<SendMessageResult> {
    await this.jobRepository.updateOne(
      { _id: command.job._id, _environmentId: command.environmentId },
      {
        $set: { stepOutput: command.bridgeData?.outputs },
      }
    );

    return {
      status: SendMessageStatus.SUCCESS,
    };
  }
}
