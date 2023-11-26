import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import {
  InstrumentUsecase,
  DetailEnum,
  CreateExecutionDetailsCommand,
  ExecutionLogQueueService,
} from '@novu/application-generic';

import { SendMessageType } from './send-message-type.usecase';
import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';

@Injectable()
export class SendMessageDelay extends SendMessageType {
  constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected executionLogQueueService: ExecutionLogQueueService
  ) {
    super(messageRepository, createLogUsecase, executionLogQueueService);
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
    await this.executionLogQueueService.add(
      metadata._id,
      CreateExecutionDetailsCommand.create({
        ...metadata,
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.DELAY_FINISHED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      }),
      command.organizationId
    );
  }
}
