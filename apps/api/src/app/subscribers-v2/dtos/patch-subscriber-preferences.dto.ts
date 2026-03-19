import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload, parseSlugId } from '@novu/application-generic';
import { ContextPayload, IPreferenceChannels } from '@novu/shared';
import { Transform, Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { ScheduleDto } from '../../shared/dtos/schedule';

export class PatchPreferenceChannelsDto implements IPreferenceChannels {
  @ApiProperty({ description: 'Email channel preference' })
  email?: boolean;

  @ApiProperty({ description: 'SMS channel preference' })
  sms?: boolean;

  @ApiProperty({ description: 'In-app channel preference' })
  in_app?: boolean;

  @ApiProperty({ description: 'Push channel preference' })
  push?: boolean;

  @ApiProperty({ description: 'Chat channel preference' })
  chat?: boolean;
}

export class PatchSubscriberPreferencesDto {
  @ApiPropertyOptional({ description: 'Channel-specific preference settings', type: PatchPreferenceChannelsDto })
  @Type(() => PatchPreferenceChannelsDto)
  channels?: PatchPreferenceChannelsDto;

  @ApiProperty({
    description:
      'Workflow internal _id, identifier or slug. If provided, update workflow specific preferences, otherwise update global preferences',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseSlugId(value))
  workflowId?: string;

  @ApiPropertyOptional({ description: 'Subscriber schedule', type: ScheduleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;
}
