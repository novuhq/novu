import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, PreferenceOverrideSourceEnum } from '@novu/shared';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';

class TemplateResponse {
  @ApiProperty({
    description: 'Unique identifier of the workflow',
    type: String,
  })
  _id: string;

  @ApiProperty({
    description: 'Name of the workflow',
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

class Overrides {
  @ApiProperty({
    type: ChannelTypeEnum,
    description: 'The channel type which is overridden',
  })
  channel: ChannelTypeEnum;
  @ApiProperty({
    type: PreferenceOverrideSourceEnum,
    description: 'The source of overrides',
  })
  source: PreferenceOverrideSourceEnum;
}

class Preference {
  @ApiProperty({
    description: 'Sets if the workflow is fully enabled for all channels or not for the subscriber.',
    type: Boolean,
  })
  enabled: boolean;

  @ApiProperty({
    type: PreferenceChannels,
    description: 'Subscriber preferences for the different channels regarding this workflow',
  })
  channels: PreferenceChannels;

  @ApiPropertyOptional({
    type: Overrides,
    description: 'Overrides for subscriber preferences for the different channels regarding this workflow',
  })
  overrides?: Overrides;
}

export class GetSubscriberPreferencesResponseDto {
  @ApiPropertyOptional({
    type: TemplateResponse,
    description: 'The workflow information and if it is critical or not',
  })
  template?: TemplateResponse;

  @ApiProperty({
    type: Preference,
    description: 'The preferences of the subscriber regarding the related workflow',
  })
  preference: Preference;
}
