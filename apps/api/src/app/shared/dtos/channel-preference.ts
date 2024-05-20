import { ApiProperty } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsEnum } from 'class-validator';

export class ChannelPreference {
  @ApiProperty({
    type: ChannelTypeEnum,
    enum: ChannelTypeEnum,
    description: 'The type of channel that is enabled or not',
  })
  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  type: ChannelTypeEnum;

  @ApiProperty({
    type: Boolean,
    description: 'If channel is enabled or not',
  })
  @IsBoolean()
  @IsDefined()
  enabled: boolean;
}
