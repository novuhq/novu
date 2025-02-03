import { ApiProperty } from '@nestjs/swagger';
import { UpdateSubscriberChannelRequestDto } from './update-subscriber-channel-request.dto';

export class ChannelSettingsDto extends UpdateSubscriberChannelRequestDto {
  @ApiProperty({
    description: 'The unique identifier of the integration associated with this channel.',
    type: String,
  })
  _integrationId: string;
}
