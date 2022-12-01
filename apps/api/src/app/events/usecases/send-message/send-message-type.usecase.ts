import { MessageEntity, MessageRepository, NotificationEntity } from '@novu/dal';
import { LogCodeEnum, LogStatusEnum } from '@novu/shared';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { SendMessageCommand } from './send-message.command';
import * as Sentry from '@sentry/node';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';

export abstract class SendMessageType {
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  public abstract execute(command: SendMessageCommand);

  protected async sendErrorStatus(
    message: MessageEntity,
    status: 'error' | 'sent' | 'warning',
    errorId: string,
    errorMessageFallback: string,
    command: SendMessageCommand,
    notification: NotificationEntity,
    logCodeEnum: LogCodeEnum,
    error?: any
  ) {
    const errorString =
      stringifyObject(error?.response?.body) ||
      stringifyObject(error?.response) ||
      stringifyObject(error) ||
      errorMessageFallback;

    if (error) {
      Sentry.captureException(errorString);
    }

    await this.messageRepository.updateMessageStatus(
      command.environmentId,
      message._subscriberId,
      message._id,
      status,
      null,
      errorId,
      errorString
    );

    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.ERROR,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        notificationId: notification._id,
        text: errorString,
        userId: command.userId,
        subscriberId: command.subscriberId,
        code: logCodeEnum,
        templateId: notification._templateId,
      })
    );
  }
}

function stringifyObject(error: any): string {
  if (!error) return;

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof String) {
    return error.toString();
  }

  if (Object.keys(error)?.length > 0) {
    return JSON.stringify(error);
  }
}
