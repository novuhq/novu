import { IsDefined, IsEnum, IsMongoId, IsOptional, IsString, IsUUID } from 'class-validator';
import { LogCodeEnum, LogStatusEnum } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class CreateLogCommand extends ApplicationWithUserCommand {
  static create(data: CreateLogCommand) {
    return CommandHelper.create<CreateLogCommand>(CreateLogCommand, data);
  }

  @IsDefined()
  @IsUUID()
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
