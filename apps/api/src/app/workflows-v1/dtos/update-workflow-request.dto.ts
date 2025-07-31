import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomDataType, IPreferenceChannels, IUpdateWorkflowDto } from '@novu/shared';
import { IsArray, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { NotificationStepDto } from '../../shared/dtos/notification-step-dto';
import { SubscriberPreferenceChannels } from '../../shared/dtos/preference-channels';

/**
 * @deprecated use dto's in /workflows directory
 */

export class UpdateWorkflowRequestDto implements IUpdateWorkflowDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(300)
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  @ValidateNested()
  steps: NotificationStepDto[];

  @ApiProperty()
  @IsOptional()
  @IsMongoId()
  notificationGroupId: string;

  @ApiPropertyOptional()
  critical?: boolean;

  @ApiPropertyOptional({
    type: SubscriberPreferenceChannels,
  })
  preferenceSettings?: IPreferenceChannels;

  @ApiPropertyOptional()
  @IsOptional()
  data?: CustomDataType;
}
