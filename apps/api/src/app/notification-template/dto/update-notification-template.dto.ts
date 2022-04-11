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
import { ChannelCTATypeEnum, ChannelTypeEnum, ICreateNotificationTemplateDto } from '@novu/shared';

export class ChannelCTADto {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  data: {
    url: string;
  };
}

export class NotificationStepDto {
  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  type: ChannelTypeEnum;

  @IsString()
  @IsDefined()
  content: string;

  @IsDefined()
  @ValidateNested()
  cta: ChannelCTADto;
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
}
