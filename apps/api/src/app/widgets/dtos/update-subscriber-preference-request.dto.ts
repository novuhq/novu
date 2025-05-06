import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ApiExtraModels, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChannelPreference } from '../../shared/dtos/channel-preference';

@ApiExtraModels(ChannelPreference)
export class UpdateSubscriberPreferenceRequestDto {
  @ApiPropertyOptional({
    type: ChannelPreference,
    description: 'Optional preferences for each channel type in the assigned workflow.',
  })
  @ValidateNested()
  @Type(() => ChannelPreference)
  @IsOptional()
  channel?: ChannelPreference;

  @ApiPropertyOptional({
    description: 'Indicates whether the workflow is fully enabled for all channels for the subscriber.',
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
