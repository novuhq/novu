import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { CreateLog } from '../../../../logs/usecases/create-log/create-log.usecase';
import { SendMessageCommand } from '../send-message.command';
import { SendMessageType } from '../send-message-type.usecase';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { CreateExecutionDetails } from '../../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { DigestService } from '../../../services/digest/digest-service';

@Injectable()
export class Digest extends SendMessageType {
  constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected digestService: DigestService
  ) {
    super(messageRepository, createLogUsecase, createExecutionDetails);
  }

  public async execute(command: SendMessageCommand) {
    const result = await this.digestService.createDigestChildJobs(command.job);
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.DIGESTED_EVENTS_PROVIDED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(result),
      })
    );
  }
}
