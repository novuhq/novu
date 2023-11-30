import { IsArray, IsBoolean, IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';

import { IPreferenceChannels, NotificationTemplateCustomData } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { NotificationStep } from '../create-notification-template';

/**
 * DEPRECATED:
 * This command is deprecated and will be removed in the future.
 * Please use the UpdateWorkflowCommand instead.
 */
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
  steps?: NotificationStep[];

  @ValidateNested()
  @IsOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };

  @IsOptional()
  data?: NotificationTemplateCustomData;
}
