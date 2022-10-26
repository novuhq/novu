import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { JobEntity } from '@novu/dal';

export enum DetailEnum {
  STEP_QUEUED = 'Step is queued for execution',
  MESSAGE_CONTENT_NOT_GENERATED = 'Message content could not be generated',
  MESSAGE_CREATED = 'Message created',
  SUBSCRIBER_NO_ACTIVE_INTEGRATION = 'Subscriber does not have an active integration',
  SUBSCRIBER_NO_CHANNEL_DETAILS = 'Subscriber does not have any email/phone number',
  SUBSCRIBER_NO_ACTIVE_CHANNEL = 'Subscriber does not have a configured channel',
  MESSAGE_SENT = 'Message sent',
  PROVIDER_ERROR = 'Unexpected provider error',
  START_SENDING = 'Start sending message',
  FILTER_STEPS = 'Step was filtered based on steps filters',
  DIGESTED_EVENTS_PROVIDED = 'Steps to get digest events found',
  DIGEST_TRIGGERED_EVENTS = 'Digest triggered events',
  STEPS_FILTERED_BY_PREFERENCES = 'Steps filtered by subscriber preferences',
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
