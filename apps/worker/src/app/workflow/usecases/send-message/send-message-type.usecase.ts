import { CreateExecutionDetails, DetailEnum } from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { SendMessageChannelCommand } from './send-message-channel.command';

export enum SendMessageStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum SendMessageStatusReason {
  USER_STEP_CONDITION = 'user:step_condition',
  SUBSCRIBER_PREFERENCE = 'subscriber:preference',
  USER_CONFIGURATION_MISSING_PHONE = 'user:configuration:missing_phone',
  USER_CONFIGURATION_MISSING_EMAIL = 'user:configuration:missing_email',
  USER_CONFIGURATION_MISSING_PUSH_TOKEN = 'user:configuration:missing_push_token',
  USER_CONFIGURATION_MISSING_WEBHOOK_URL = 'user:configuration:missing_webhook_url',
  USER_CONFIGURATION_MISSING_CREDENTIALS = 'user:configuration:some_channels_missing_credentials',
}

export type SendMessageResultPassed = {
  status: SendMessageStatus.SUCCESS ;
  extraData?: string;
};

export type SendMessageResultSkipped = {
  status:  SendMessageStatus.SKIPPED;
  statusReason: SendMessageStatusReason;
  extraData?: string;
};

export type SendMessageResultFailed = {
  status: SendMessageStatus.FAILED;
  errorMessage: DetailEnum;
  extraData?: string;
};

export type SendMessageResult = SendMessageResultPassed | SendMessageResultSkipped| SendMessageResultFailed;

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
