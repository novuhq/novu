import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { JobEntity } from '@novu/dal';

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
