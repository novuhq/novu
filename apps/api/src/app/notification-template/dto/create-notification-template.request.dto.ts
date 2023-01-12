import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ICreateNotificationTemplateDto, IPreferenceChannels } from '@novu/shared';

import { StepFilter } from '../../shared/dtos/step-filter';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { MessageTemplate } from '../../shared/dtos/message-template';

class NotificationChannel {
  @ApiPropertyOptional({
    type: MessageTemplate,
  })
  @ValidateNested()
  @IsOptional()
  template?: MessageTemplate;

  @ApiPropertyOptional({
    type: [StepFilter],
  })
  @IsArray()
  @ValidateNested()
  @IsOptional()
  filters?: StepFilter[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateNotificationTemplateRequestDto implements ICreateNotificationTemplateDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsString()
  @IsDefined({
    message: 'Notification group must be provided',
  })
  notificationGroupId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  description: string;

  @ApiProperty({
    type: [NotificationChannel],
  })
  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationChannel[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  draft?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  critical?: boolean;

  @ApiPropertyOptional({
    type: PreferenceChannels,
  })
  @IsOptional()
  preferenceSettings?: IPreferenceChannels;
}
