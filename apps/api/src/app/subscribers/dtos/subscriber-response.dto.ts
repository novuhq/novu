import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelCredentials } from '../../shared/dtos/subscriber-channel';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

class ChannelSettings {
  @ApiProperty({
    description: 'Id of the integration that is used for this channel',
  })
  _integrationId: string;

  @ApiProperty({
    enum: { ...ChatProviderIdEnum, ...PushProviderIdEnum },
    description: 'Subscriber credentials for channel',
  })
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    description: 'Subscriber credentials for channel',
  })
  credentials: ChannelCredentials;
}

export class SubscriberResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiProperty({
    description: 'Your internal identifire for subscriber',
  })
  subscriberId: string;

  @ApiPropertyOptional({
    type: [ChannelSettings],
    description: 'Channels settings for subscriber',
  })
  channels?: ChannelSettings[];

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;
}
