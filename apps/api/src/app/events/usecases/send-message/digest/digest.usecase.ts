import { Injectable } from '@nestjs/common';
import { MessageRepository, JobEntity } from '@novu/dal';
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
    const result = (await this.digestService.createDigestChildJobs(command.job)) ?? [];
    for (const job of result) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_CREATED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }
    const currentJobDetails = CreateExecutionDetailsCommand.getDetailsFromJob(command.job);
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...currentJobDetails,
        detail: DetailEnum.DIGESTED_EVENTS_PROVIDED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(result),
      })
    );
    const digestedPayload = await this.digestService.getDigestedPayload(command.job);
    this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...currentJobDetails,
        detail: DetailEnum.DIGEST_TRIGGERED_EVENTS,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(digestedPayload),
      })
    );
  }
}
