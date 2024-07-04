import { IsArray, IsDefined, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { MessagesStatusEnum } from '@novu/shared';

export class MarkMessageAsByMarkCommand extends EnvironmentWithSubscriber {
  @IsArray()
  messageIds: string[];

  @IsDefined()
  @IsEnum(MessagesStatusEnum)
  markAs: MessagesStatusEnum;

  @IsNotEmpty()
  @IsString()
  __source: 'notification_center' | 'api';
}
