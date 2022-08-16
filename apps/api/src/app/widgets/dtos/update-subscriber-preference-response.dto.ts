import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';

class TemplateResponse {
  @ApiProperty()
  _id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  critical: boolean;
}

class Preference {
  @ApiProperty()
  enabled: boolean;
  @ApiProperty({
    type: PreferenceChannels,
  })
  channels: PreferenceChannels;
}

export class UpdateSubscriberPreferenceResponseDto {
  @ApiProperty({
    type: TemplateResponse,
  })
  template: TemplateResponse;
  @ApiProperty({
    type: Preference,
  })
  preference: Preference;
}
