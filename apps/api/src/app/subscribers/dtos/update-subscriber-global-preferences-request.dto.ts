import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { ChannelPreference } from '../../shared/dtos/channel-preference';

export class UpdateSubscriberGlobalPreferencesRequestDto {
  @ApiPropertyOptional({
    description: 'Enable or disable the subscriber global preferences.',
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    type: [ChannelPreference],
    description: 'The subscriber global preferences for every ChannelTypeEnum.',
    isArray: true,
  })
  preferences?: ChannelPreference[];
}
