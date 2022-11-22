import { ChannelTypeEnum, IEmailBlock, IMessageCTA, IActor } from '@novu/shared';
import { IsOptional } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CreateMessageCommand extends EnvironmentCommand {
  @IsOptional()
  _notificationId?: string;

  @IsOptional()
  _subscriberId?: string;

  @IsOptional()
  subscriberId: string;

  @IsOptional()
  _templateId?: string;

  @IsOptional()
  _messageTemplateId?: string;

  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsOptional()
  cta?: IMessageCTA;

  @IsOptional()
  _feedId?: string;

  @IsOptional()
  transactionId?: string;

  @IsOptional()
  content?: string | IEmailBlock[];

  @IsOptional()
  payload?: any;

  @IsOptional()
  templateIdentifier?: string;

  @IsOptional()
  _jobId?: string;

  @IsOptional()
  actor?: IActor;

  @IsOptional()
  invalidate?: boolean;
}
