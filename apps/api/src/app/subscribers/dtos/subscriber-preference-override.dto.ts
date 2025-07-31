import { ApiProperty } from '@nestjs/swagger';
import { ChannelTypeEnum, IPreferenceOverride, PreferenceOverrideSourceEnum } from '@novu/shared';

export class SubscriberPreferenceOverrideDto implements IPreferenceOverride {
  @ApiProperty({
    enum: [...Object.values(ChannelTypeEnum)],
    enumName: 'ChannelTypeEnum',
    description: 'The channel type which is overridden',
  })
  channel: ChannelTypeEnum;
  @ApiProperty({
    enum: [...Object.values(PreferenceOverrideSourceEnum)],
    enumName: 'PreferenceOverrideSourceEnum',
    description: 'The source of overrides',
  })
  source: PreferenceOverrideSourceEnum;
}
