import {
  IsArray,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ChannelCTATypeEnum, ChannelTypeEnum, ICreateNotificationTemplateDto, IEmailBlock } from '@novu/shared';
import { MessageFilter } from './create-notification-template.dto';

export class ChannelCTADto {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export class NotificationStepDto {
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  type: ChannelTypeEnum;

  @IsDefined()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType?: 'editor' | 'customHtml';

  @IsOptional()
  @ValidateNested()
  cta: ChannelCTADto;

  @IsOptional()
  name?: string;

  @IsOptional()
  subject?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested()
  filters?: MessageFilter[];

  @IsMongoId()
  @IsOptional()
  _id?: string;
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
