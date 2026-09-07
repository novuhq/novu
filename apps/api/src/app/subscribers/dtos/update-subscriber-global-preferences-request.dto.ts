import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
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
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreference)
  preferences?: ChannelPreference[];
}
