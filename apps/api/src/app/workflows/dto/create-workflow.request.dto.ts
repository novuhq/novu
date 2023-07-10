import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ICreateNotificationTemplateDto, IPreferenceChannels } from '@novu/shared';

import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { NotificationStep } from '../../shared/dtos/notification-step';

export class CreateWorkflowRequestDto implements ICreateNotificationTemplateDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsString()
  @IsDefined({
    message: 'Notification group must be provided ',
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
    type: [NotificationStep],
  })
  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationStep[];

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blueprintId?: string;
}
