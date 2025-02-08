import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomDataType, ICreateWorkflowDto, INotificationGroup, IPreferenceChannels } from '@novu/shared';

import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { NotificationStepDto } from '../../shared/dtos/notification-step-dto';

/**
 * @deprecated use dto's in /workflows directory
 */

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
    type: [NotificationStepDto],
  })
  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationStepDto[];

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
  data?: CustomDataType;
}
