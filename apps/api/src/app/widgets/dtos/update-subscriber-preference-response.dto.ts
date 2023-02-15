import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';

class TemplateResponse {
  @ApiProperty({
    description: 'Unique identifier of the notification template',
    type: String,
  })
  _id: string;

  @ApiProperty({
    description: 'Name of the notification template',
    type: String,
  })
  name: string;

  @ApiProperty({
    description:
      'Critical templates will always be delivered to the end user and should be hidden from the subscriber preferences screen',
    type: Boolean,
  })
  critical: boolean;
}

class Preference {
  @ApiProperty({
    description: 'Sets if the notification template is fully enabled for all channels or not for the subscriber.',
    type: Boolean,
  })
  enabled: boolean;

  @ApiProperty({
    type: PreferenceChannels,
    description: 'Subscriber preferences for the different channels regarding this notification template',
  })
  channels: PreferenceChannels;
}

export class UpdateSubscriberPreferenceResponseDto {
  @ApiProperty({
    type: TemplateResponse,
    description: 'The notification template information and if it is critical or not',
  })
  template: TemplateResponse;

  @ApiProperty({
    type: Preference,
    description: 'The preferences of the subscriber regarding the related notification template',
  })
  preference: Preference;
}
