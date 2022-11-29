import { IsArray, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ICreateNotificationTemplateDto, IPreferenceChannels } from '@novu/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { NotificationStep } from '../../shared/dtos/notification-step';

export class UpdateNotificationTemplateRequestDto implements ICreateNotificationTemplateDto {
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
  @MaxLength(100)
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
  active?: boolean;

  @ApiPropertyOptional()
  critical?: boolean;

  @ApiPropertyOptional({
    type: PreferenceChannels,
  })
  preferenceSettings?: IPreferenceChannels;
}
