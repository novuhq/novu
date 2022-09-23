import { MessageRepository, NotificationEntity } from '@novu/dal';
import { LogCodeEnum, LogStatusEnum } from '@novu/shared';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { SendMessageCommand } from './send-message.command';
import * as Sentry from '@sentry/node';

export abstract class SendMessageType {
  protected constructor(protected messageRepository: MessageRepository, protected createLogUsecase: CreateLog) {}

  public abstract execute(command: SendMessageCommand);

  protected async sendErrorStatus(
    message,
    status: 'error' | 'sent' | 'warning',
    errorId: string,
    errorMessage: string | any,
    command: SendMessageCommand,
    notification: NotificationEntity,
    logCodeEnum: LogCodeEnum,
    error?: any
  ) {
    if (error) {
      Sentry.captureException(error?.response?.body || error?.response || error?.errors || error);
    }

    const errorString = (toStringify(errorMessage?.response?.body) ||
      toStringify(errorMessage?.response) ||
      toStringify(errorMessage) ||
      JSON.stringify(errorMessage)) as string;

    await this.messageRepository.updateMessageStatus(message._id, status, null, errorId, errorString);

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

function toStringify(message: any): string | boolean {
  if (typeof message === 'string' || message instanceof String) {
    return message.toString();
  }

  if (Object.keys(message).length > 0) {
    return JSON.stringify(message);
  }

  return false;
}
