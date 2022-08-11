import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelPreference {
  @ApiProperty({
    type: ChannelTypeEnum,
    enum: ChannelTypeEnum,
    description: 'The type of channel that is enabled or not',
  })
  type: ChannelTypeEnum;

  @ApiProperty({
    type: Boolean,
    description: 'If channel is enabled or not',
  })
  enabled: boolean;
}

@ApiExtraModels(ChannelPreference)
export class UpdateSubscriberPreferenceRequestDto {
  @ApiProperty({
    type: ChannelPreference,
    description: 'Channel with prefrence',
  })
  @ValidateNested()
  channel?: ChannelPreference;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
