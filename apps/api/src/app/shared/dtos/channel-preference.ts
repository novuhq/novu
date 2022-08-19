import { ApiProperty } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';

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
