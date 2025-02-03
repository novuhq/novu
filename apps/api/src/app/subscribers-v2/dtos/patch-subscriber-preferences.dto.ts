import { ApiProperty } from '@nestjs/swagger';
import { IPreferenceChannels } from '@novu/shared';
import { Type, Transform } from 'class-transformer';
import { IsMongoId, IsOptional } from 'class-validator';
import { parseSlugId } from '../../workflows-v2/pipes/parse-slug-id';

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
  @ApiProperty({ description: 'Channel-specific preference settings', type: PatchPreferenceChannelsDto })
  @Type(() => PatchPreferenceChannelsDto)
  channels: PatchPreferenceChannelsDto;

  @ApiProperty({
    description: 'If provided, update workflow specific preferences, otherwise update global preferences',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseSlugId(value))
  @IsMongoId()
  workflowId?: string;
}
