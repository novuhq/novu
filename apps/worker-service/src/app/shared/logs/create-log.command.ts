import { IsDefined, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { LogCodeEnum, LogStatusEnum, TopicId } from '@novu/shared';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class CreateLogCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  transactionId: string;

  @IsOptional()
  @IsMongoId()
  notificationId?: string;

  @IsOptional()
  @IsMongoId()
  messageId?: string;

  @IsOptional()
  @IsMongoId()
  templateId?: string;

  @IsOptional()
  @IsMongoId()
  subscriberId?: string;

  @IsOptional()
  @IsMongoId()
  topicId?: TopicId;

  @IsOptional()
  @IsEnum(LogStatusEnum)
  status: LogStatusEnum;

  @IsString()
  text: string;

  @IsOptional()
  @IsEnum(LogCodeEnum)
  code?: LogCodeEnum;

  @IsOptional()
  raw?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
