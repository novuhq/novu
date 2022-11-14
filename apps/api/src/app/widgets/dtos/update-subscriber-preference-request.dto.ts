import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelPreference } from '../../shared/dtos/channel-preference';

@ApiExtraModels(ChannelPreference)
export class UpdateSubscriberPreferenceRequestDto {
  @ApiProperty({
    type: ChannelPreference,
    description: 'Channel with preference',
  })
  @ValidateNested()
  channel?: ChannelPreference;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
