import * as Sentry from '@sentry/node';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { LogCodeEnum } from '@novu/shared';
import { ExecutionLogRoute } from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';

export abstract class SendMessageType {
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected executionLogRoute: ExecutionLogRoute
  ) {}

  public abstract execute(command: SendMessageCommand);

  protected async sendErrorStatus(
    message: MessageEntity,
    status: 'error' | 'sent' | 'warning',
    errorId: string,
    errorMessageFallback: string,
    command: SendMessageCommand,
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
      message._id,
      status,
      null,
      errorId,
      errorString
    );
  }
}

function stringifyObject(error: any): string {
  if (!error) return '';

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof String) {
    return error.toString();
  }

  if (Object.keys(error)?.length > 0) {
    return JSON.stringify(error);
  }

  return '';
}
