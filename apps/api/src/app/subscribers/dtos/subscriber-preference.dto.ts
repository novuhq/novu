import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriberPreferenceChannels } from '../../shared/dtos/preference-channels';
import { SubscriberPreferenceOverrideDto } from './subscriber-preference-override.dto';

export class SubscriberPreferenceDto {
  @ApiProperty({
    description: 'Sets if the workflow is fully enabled for all channels or not for the subscriber.',
    type: Boolean,
  })
  enabled: boolean;

  @ApiProperty({
    type: SubscriberPreferenceChannels,
    description: 'Subscriber preferences for the different channels regarding this workflow',
  })
  channels: SubscriberPreferenceChannels;

  @ApiPropertyOptional({
    type: SubscriberPreferenceOverrideDto,
    description: 'Overrides for subscriber preferences for the different channels regarding this workflow',
  })
  overrides?: SubscriberPreferenceOverrideDto;
}
