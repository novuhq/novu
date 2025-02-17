import { captureException } from '@sentry/node';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { ExecutionLogRoute } from '@novu/application-generic';
import { SendMessageCommand } from './send-message.command';

export abstract class SendMessageType {
  protected constructor(
    protected messageRepository: MessageRepository,
    protected executionLogRoute: ExecutionLogRoute
  ) {}

  public abstract execute(command: SendMessageCommand): void;

  protected async sendErrorStatus(
    message: MessageEntity,
    status: 'error' | 'sent' | 'warning',
    errorId: string,
    errorMessageFallback: string,
    command: SendMessageCommand,
    error?: any
  ): Promise<void> {
    const errorString = this.stringifyError(error) || errorMessageFallback;

    if (error) {
      captureException(errorString);
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

  private stringifyError(error: any): string {
    if (!error) return '';

    if (typeof error === 'string' || error instanceof String) {
      return error.toString();
    }
    if (Object.keys(error)?.length > 0) {
      return JSON.stringify(error);
    }

    return '';
  }
}
