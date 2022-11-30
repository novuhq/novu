import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { EmailEventStatusEnum, SmsEventStatusEnum } from '@novu/stateless';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { JobEntity } from '@novu/dal';

export enum DetailEnum {
  CHAT_WEBHOOK_URL_MISSING = 'Webhook URL for the chat channel is missing',
  STEP_CREATED = 'Step created',
  STEP_QUEUED = 'Step queued',
  STEP_DELAYED = 'Step delayed',
  MESSAGE_CONTENT_NOT_GENERATED = 'Message content could not be generated',
  MESSAGE_CREATED = 'Message created',
  SUBSCRIBER_NO_ACTIVE_INTEGRATION = 'Subscriber does not have an active integration',
  SUBSCRIBER_NO_CHANNEL_DETAILS = 'Subscriber missing recipient details',
  SUBSCRIBER_NO_ACTIVE_CHANNEL = 'Subscriber does not have a configured channel',
  MESSAGE_SENT = 'Message sent',
  PROVIDER_ERROR = 'Unexpected provider error',
  START_SENDING = 'Start sending message',
  START_DIGESTING = 'Start digesting',
  FILTER_STEPS = 'Step was filtered based on steps filters',
  DIGESTED_EVENTS_PROVIDED = 'Steps to get digest events found',
  DIGEST_TRIGGERED_EVENTS = 'Digest triggered events',
  STEP_FILTERED_BY_PREFERENCES = 'Step filtered by subscriber preferences',
  DIGEST_MERGED = 'Digest was merged with other digest',
  DELAY_FINISHED = 'Delay is finished',
  PUSH_MISSING_DEVICE_TOKENS = 'Subscriber credentials is missing the tokens for sending a push notification message',
}

export class CreateExecutionDetailsCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  jobId?: string;

  @IsNotEmpty()
  notificationId: string;

  @IsOptional()
  notificationTemplateId?: string;

  @IsOptional()
  messageId?: string;

  @IsOptional()
  providerId?: string;

  @IsNotEmpty()
  transactionId: string;

  @IsOptional()
  channel?: StepTypeEnum;

  @IsNotEmpty()
  detail: string;

  @IsNotEmpty()
  source: ExecutionDetailsSourceEnum;

  @IsNotEmpty()
  status: ExecutionDetailsStatusEnum;

  @IsNotEmpty()
  isTest: boolean;

  @IsNotEmpty()
  isRetry: boolean;

  @IsOptional()
  @IsString()
  raw?: string;

  webhookStatus?: EmailEventStatusEnum | SmsEventStatusEnum;

  static getDetailsFromJob(
    job: JobEntity
  ): Pick<
    CreateExecutionDetailsCommand,
    | 'environmentId'
    | 'organizationId'
    | 'subscriberId'
    | 'jobId'
    | 'notificationId'
    | 'notificationTemplateId'
    | 'providerId'
    | 'transactionId'
    | 'channel'
  > {
    return {
      environmentId: job._environmentId,
      organizationId: job._organizationId,
      subscriberId: job._subscriberId,
      jobId: job._id,
      notificationId: job._notificationId,
      notificationTemplateId: job._templateId,
      providerId: job.providerId,
      transactionId: job.transactionId,
      channel: job.type,
    };
  }
}
