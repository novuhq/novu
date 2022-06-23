import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  ICreateNotificationTemplateDto,
} from '@novu/shared';
import { MessageTemplateDto } from './message-template.dto';

export class NotificationChannelDto {
  @ValidateNested()
  @IsOptional()
  template?: MessageTemplateDto;

  @IsArray()
  @ValidateNested()
  @IsOptional()
  filters?: MessageFilter[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class MessageFilter {
  isNegated: boolean;

  @IsString()
  type: BuilderFieldType;

  @IsString()
  value: BuilderGroupValues;

  @IsArray()
  children: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
  }[];
}

export class CreateNotificationTemplateDto implements ICreateNotificationTemplateDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined({
    message: 'Notification group must be provided',
  })
  notificationGroupId: string;

  @IsOptional()
  @IsArray()
  tags: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  description: string;

  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationChannelDto[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  draft?: boolean;
}
