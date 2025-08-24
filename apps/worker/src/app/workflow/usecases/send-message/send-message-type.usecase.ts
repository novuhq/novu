import { CreateExecutionDetails, DetailEnum } from '@novu/application-generic';
import { DeliveryLifecycleState, MessageEntity, MessageRepository } from '@novu/dal';
import { SendMessageChannelCommand } from './send-message-channel.command';

export enum SendMessageStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export type SendMessageResultPassed = {
  status: SendMessageStatus.SUCCESS;
  extraData?: string;
};

export type SendMessageResultSkipped = {
  status: SendMessageStatus.SKIPPED;
  deliveryLifecycleState?: DeliveryLifecycleState;
  extraData?: string;
};

export type SendMessageResultFailed = {
  status: SendMessageStatus.FAILED;
  errorMessage: DetailEnum;
  extraData?: string;
};

export type SendMessageResult = SendMessageResultPassed | SendMessageResultSkipped | SendMessageResultFailed;

export abstract class SendMessageType {
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  public abstract execute(command: SendMessageChannelCommand): Promise<SendMessageResult>;

  protected async sendErrorStatus(
    message: MessageEntity,
    status: 'error' | 'sent' | 'warning',
    errorId: string,
    errorMessageFallback: string,
    command: SendMessageChannelCommand,
    error?: any
  ): Promise<void> {
    const errorString = this.stringifyError(error) || errorMessageFallback;

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
