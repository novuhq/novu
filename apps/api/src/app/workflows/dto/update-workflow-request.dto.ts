import { IsArray, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ICreateWorkflowDto, IPreferenceChannels, NotificationTemplateCustomData } from '@novu/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { NotificationStep } from '../../shared/dtos/notification-step';

export class UpdateWorkflowRequestDto implements ICreateWorkflowDto {
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
  steps: NotificationStep[];

  @ApiProperty()
  @IsOptional()
  @IsMongoId()
  notificationGroupId: string;

  @ApiPropertyOptional()
  critical?: boolean;

  @ApiPropertyOptional({
    type: PreferenceChannels,
  })
  preferenceSettings?: IPreferenceChannels;

  @ApiPropertyOptional()
  @IsOptional()
  data?: NotificationTemplateCustomData;
}
