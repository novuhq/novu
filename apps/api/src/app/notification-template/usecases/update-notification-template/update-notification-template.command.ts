import { IsArray, IsBoolean, IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IPreferenceChannels } from '@novu/shared';
import { NotificationStep } from '../../../shared/dtos/notification-step';

export class UpdateNotificationTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsArray()
  @IsOptional()
  tags: string[];

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  identifier: string;

  @IsBoolean()
  @IsOptional()
  critical: boolean;

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
  steps: NotificationStep[];
}
