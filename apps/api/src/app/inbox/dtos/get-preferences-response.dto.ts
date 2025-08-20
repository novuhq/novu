import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceLevelEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsDefined, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { SubscriberPreferenceChannels } from '../../shared/dtos/preference-channels';
import { WorkflowDto } from './workflow.dto';

export class GetPreferencesResponseDto {
  @ApiProperty({
    enum: PreferenceLevelEnum,
    enumName: 'PreferenceLevelEnum',
    description: 'The level of the preference (global or template)',
  })
  @IsDefined()
  @IsEnum(PreferenceLevelEnum, {
    message: 'level must be a valid PreferenceLevelEnum',
  })
  level: PreferenceLevelEnum;

  @ApiPropertyOptional({
    type: WorkflowDto,
    description: 'Workflow information if this is a template-level preference',
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowDto)
  workflow?: WorkflowDto;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the preference is enabled',
    example: true,
  })
  @IsDefined()
  enabled: boolean;

  @ApiProperty({
    type: SubscriberPreferenceChannels,
    description: 'Channel-specific preference settings',
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => SubscriberPreferenceChannels)
  channels: SubscriberPreferenceChannels;
}
