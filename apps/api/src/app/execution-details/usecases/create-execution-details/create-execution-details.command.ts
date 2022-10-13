import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class CreateExecutionDetailsCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  jobId?: string;

  @IsNotEmpty()
  notificationId: string;

  @IsNotEmpty()
  notificationTemplateId: string;

  @IsOptional()
  messageId?: string;

  @IsOptional()
  providerId?: string;

  @IsNotEmpty()
  transactionId: string;

  @IsNotEmpty()
  channel: StepTypeEnum;

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
}
