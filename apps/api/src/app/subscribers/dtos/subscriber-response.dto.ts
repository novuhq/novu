import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateSubscriberChannelRequestDto } from './update-subscriber-channel-request.dto';

class ChannelSettings extends UpdateSubscriberChannelRequestDto {
  @ApiProperty({
    description: 'Id of the integration that is used for this channel',
  })
  _integrationId: string;
}

export class SubscriberResponseDto {
  @ApiPropertyOptional({
    description:
      'The internal id novu generated for your subscriber, this is not the subscriberId matching your query. See `subscriberId` for that',
  })
  _id?: string;

  @ApiProperty()
  firstName?: string;

  @ApiProperty()
  lastName?: string;

  @ApiProperty()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional()
  locale?: string;

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
  isOnline?: boolean;

  @ApiProperty()
  lastOnlineAt?: string;

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
