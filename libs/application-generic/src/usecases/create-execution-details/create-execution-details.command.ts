import { ExecutionDetailsEntity, ExecutionDetailsRepository, JobEntity } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { EmailEventStatusEnum, SmsEventStatusEnum } from '@novu/stateless';
import { IsDate, IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../commands';
import { DetailEnum } from './types';

export class CreateExecutionDetailsCommand extends EnvironmentWithSubscriber {
  // used for trace log
  @IsString()
  @IsDefined()
  workflowRunIdentifier: string;

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
  detail: DetailEnum;

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
  // todo check if this can required
  _subscriberId?: string;

  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  webhookStatus?: EmailEventStatusEnum | SmsEventStatusEnum;

  static getDetailsFromJob(
    job: JobEntity
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
    | 'workflowRunIdentifier'
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
      workflowRunIdentifier: job.identifier,
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
