import { IsArray, IsBoolean, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ICreateNotificationTemplateDto, DigestUnitEnum, DigestTypeEnum, IPreferenceChannels } from '@novu/shared';
import { MessageFilter } from './create-notification-template.request.dto';
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

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  @IsMongoId()
  _templateId?: string;

  @IsOptional()
  metadata?: {
    amount?: number;
    unit?: DigestUnitEnum;
    digestKey?: string;
    type: DigestTypeEnum;
    backoffUnit?: DigestUnitEnum;
    backoffAmount?: number;
  };
}

export class UpdateNotificationTemplateRequestDto implements ICreateNotificationTemplateDto {
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

  critical?: boolean;

  preferenceSettings?: IPreferenceChannels;
}
