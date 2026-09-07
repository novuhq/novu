import { CreateExecutionDetails, DetailEnum } from '@novu/application-generic';
import { DeliveryLifecycleState, JobEntity, MessageEntity, MessageRepository } from '@novu/dal';
import { safeJsonStringify } from '@novu/shared';
import { SendMessageChannelCommand } from './send-message-channel.command';

export enum SendMessageStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  THROTTLED = 'throttled',
}

export type SendMessageResultPassed = {
  status: SendMessageStatus.SUCCESS;
  extraData?: string;
  job?: JobEntity;
};

export type SendMessageResultSkipped = {
  status: SendMessageStatus.SKIPPED;
  deliveryLifecycleState?: DeliveryLifecycleState;
  extraData?: string;
  job?: JobEntity;
};

export type SendMessageResultFailed = {
  status: SendMessageStatus.FAILED;
  errorMessage: DetailEnum;
  extraData?: string;
  job?: JobEntity;
  shouldHalt?: boolean;
};

export type SendMessageResultThrottled = {
  status: SendMessageStatus.THROTTLED;
  extraData?: string;
  job?: JobEntity;
};

export type SendMessageResult =
  | SendMessageResultPassed
  | SendMessageResultSkipped
  | SendMessageResultFailed
  | SendMessageResultThrottled;

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
      return safeJsonStringify(error);
    }

    return '';
  }
}
