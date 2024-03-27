import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ICreateWorkflowDto,
  INotificationGroup,
  IPreferenceChannels,
  NotificationTemplateCustomData,
} from '@novu/shared';

import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { NotificationStep } from '../../shared/dtos/notification-step';

export class CreateWorkflowRequestDto implements ICreateWorkflowDto {
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

  @ApiProperty()
  @IsOptional()
  notificationGroup?: INotificationGroup;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
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

  @ApiPropertyOptional({ deprecated: true })
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

  @ApiPropertyOptional()
  @IsOptional()
  data?: NotificationTemplateCustomData;
}
