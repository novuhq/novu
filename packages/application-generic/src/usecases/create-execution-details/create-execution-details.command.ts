import { IsNotEmpty, IsOptional, IsString, IsDate } from 'class-validator';
import { ExecutionDetailsEntity, ExecutionDetailsRepository } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IJob,
  StepTypeEnum,
} from '@novu/shared';
import { EmailEventStatusEnum, SmsEventStatusEnum } from '@novu/stateless';

import { EnvironmentWithSubscriber } from '../../commands/project.command';

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

  @IsOptional()
  expireAt?: string;

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
  raw?: string | null;

  @IsOptional()
  @IsString()
  _subscriberId?: string;

  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  webhookStatus?: EmailEventStatusEnum | SmsEventStatusEnum;

  static getDetailsFromJob(
    job: IJob
  ): Pick<
    CreateExecutionDetailsCommand,
    | 'environmentId'
    | 'organizationId'
    | 'subscriberId'
    | '_subscriberId'
    | 'jobId'
    | 'notificationId'
    | 'notificationTemplateId'
    | 'providerId'
    | 'transactionId'
    | 'channel'
    | 'expireAt'
  > {
    return {
      environmentId: job._environmentId,
      organizationId: job._organizationId,
      subscriberId: job.subscriberId,
      // backward compatibility - ternary needed to be removed once the queue renewed
      _subscriberId: job._subscriberId ? job._subscriberId : job.subscriberId,
      jobId: job._id,
      notificationId: job._notificationId,
      notificationTemplateId: job._templateId,
      providerId: job.providerId,
      transactionId: job.transactionId,
      channel: job.type,
      expireAt: job.expireAt,
    };
  }

  static getExecutionLogMetadata(): Pick<ExecutionDetailsEntity, '_id'> & {
    createdAt: Date;
  } {
    return {
      _id: ExecutionDetailsRepository.createObjectId(),
      createdAt: new Date(),
    };
  }
}
