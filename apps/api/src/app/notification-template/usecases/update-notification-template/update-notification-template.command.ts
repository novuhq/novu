import { IsArray, IsBoolean, IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IPreferenceChannels } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { NotificationStep } from '../create-notification-template';

export class UpdateNotificationTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  id: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  identifier?: string;

  @IsBoolean()
  @IsOptional()
  critical?: boolean;

  @IsOptional()
  preferenceSettings?: IPreferenceChannels;

  @IsOptional()
  @IsMongoId({
    message: 'Bad group id name',
  })
  notificationGroupId: string;

  @IsArray()
  @ValidateNested()
  @IsOptional()
  steps?: Array<NotificationStep & { _templateId?: string }>;

  @ValidateNested()
  @IsOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };
}
