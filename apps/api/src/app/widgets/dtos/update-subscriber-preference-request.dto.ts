import { IsBoolean, IsOptional, ValidateNested, IsString } from 'class-validator';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelPreference } from '../../shared/dtos/channel-preference';

@ApiExtraModels(ChannelPreference)
export class UpdateSubscriberPreferenceRequestDto {
  @ApiProperty({
    type: ChannelPreference,
    description: 'The subscriber preferences for every ChannelTypeEnum for the workflow assigned.',
  })
  @ValidateNested()
  channel?: ChannelPreference;

  @ApiPropertyOptional({
    description: 'Sets if the workflow is fully enabled for all channels or not for the subscriber.',
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Subscriber locale',
    type: String,
  })
  @IsString()
  @IsOptional()
  locale?: string;
}
