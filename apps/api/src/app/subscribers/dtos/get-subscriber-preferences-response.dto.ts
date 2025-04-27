import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriberPreferenceDto } from './subscriber-preference.dto';
import { SubscriberPreferenceTemplateResponseDto } from './subscriber-preference-template-response.dto';

export class GetSubscriberPreferencesResponseDto {
  @ApiPropertyOptional({
    type: SubscriberPreferenceTemplateResponseDto,
    description: 'The workflow information and if it is critical or not',
  })
  template?: SubscriberPreferenceTemplateResponseDto;

  @ApiProperty({
    type: SubscriberPreferenceDto,
    description: 'The preferences of the subscriber regarding the related workflow',
  })
  preference: SubscriberPreferenceDto;
}
