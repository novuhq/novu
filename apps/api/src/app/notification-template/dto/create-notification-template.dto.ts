import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  ChannelCTATypeEnum,
  ChannelTypeEnum,
  ICreateNotificationTemplateDto,
  IEmailBlock,
} from '@novu/shared';

export class ChannelCTADto {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export class NotificationChannelDto {
  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  type: ChannelTypeEnum;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  name?: string;

  @IsDefined()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType?: 'editor' | 'customHtml';

  @ValidateNested()
  cta?: ChannelCTADto;

  @IsArray()
  @ValidateNested()
  @IsOptional()
  filters?: MessageFilter[];
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
