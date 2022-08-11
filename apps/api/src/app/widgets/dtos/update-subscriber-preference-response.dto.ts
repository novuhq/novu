import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateResponse {
  @ApiProperty()
  _id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  critical: boolean;
}

export class PreferenceChannels {
  @ApiPropertyOptional()
  email?: boolean;
  @ApiPropertyOptional()
  sms?: boolean;
  @ApiPropertyOptional()
  in_app?: boolean;
  @ApiPropertyOptional()
  direct?: boolean;
  @ApiPropertyOptional()
  push?: boolean;
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
