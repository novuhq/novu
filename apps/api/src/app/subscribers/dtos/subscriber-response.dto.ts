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
  @ApiPropertyOptional({
    description:
      'The internal id novu generated for your subscriber, this is not the subscriberId matching your query. See `subscriberId` for that',
  })
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
    description:
      'The internal identifier you used to create this subscriber, usually correlates to the id the user in your systems',
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

  @ApiProperty()
  deleted: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  __v?: number;
}
