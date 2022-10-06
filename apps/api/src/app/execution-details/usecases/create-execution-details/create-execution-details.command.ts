import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ChannelTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class CreateExecutionDetailsCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  jobId: string;

  @IsNotEmpty()
  notificationId: string;

  @IsNotEmpty()
  notificationTemplateId: string;

  @IsOptional()
  messageId: string;

  @IsNotEmpty()
  providerId: string;

  @IsNotEmpty()
  transactionId: string;

  @IsNotEmpty()
  channel: ChannelTypeEnum;

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
  search?: string;
}
