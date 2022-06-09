import { IsArray, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ICreateNotificationTemplateDto } from '@novu/shared';
import { MessageFilter } from './create-notification-template.dto';
import { MessageTemplateDto } from './message-template.dto';

export class NotificationStepDto {
  @IsMongoId()
  @IsOptional()
  _id?: string;

  @ValidateNested()
  @IsOptional()
  template?: MessageTemplateDto;

  @IsOptional()
  @IsArray()
  @ValidateNested()
  filters?: MessageFilter[];
}

export class UpdateNotificationTemplateDto implements ICreateNotificationTemplateDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsArray()
  @IsOptional()
  tags: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  description: string;

  @IsArray()
  @IsOptional()
  @ValidateNested()
  steps: NotificationStepDto[];

  @IsOptional()
  @IsMongoId()
  notificationGroupId: string;

  active?: boolean;
}
