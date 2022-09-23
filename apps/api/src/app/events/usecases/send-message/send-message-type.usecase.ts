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
    errorMessageFallback: string | any,
    command: SendMessageCommand,
    notification: NotificationEntity,
    logCodeEnum: LogCodeEnum,
    error?: any
  ) {
    const errorString = (toStringify(error?.response?.body) ||
      toStringify(error?.response) ||
      toStringify(error) ||
      JSON.stringify(errorMessageFallback)) as string;

    if (error) {
      Sentry.captureException(errorString);
    }

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

function toStringify(error: any): string | boolean {
  if (!error) return false;

  if (typeof error === 'string' || error instanceof String) {
    return error.toString();
  }

  if (Object.keys(error)?.length > 0) {
    return JSON.stringify(error);
  }

  return false;
}
