import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IChannelCredentials } from './update-subscriber.dto';
import { DirectProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class IChannelSettings {
  @ApiProperty({
    description: 'Id of the integration that is used for this channel',
  })
  _integrationId: string;

  @ApiProperty({
    enum: { ...DirectProviderIdEnum, ...PushProviderIdEnum },
    description: 'Subscriber credentials for channel',
  })
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    description: 'Subscriber credentials for channel',
  })
  credentials: IChannelCredentials;
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

  @ApiProperty()
  subscriberId: string;

  @ApiPropertyOptional({
    type: [IChannelSettings],
    description: 'Channels settings for subscriber',
  })
  channels?: IChannelSettings[];

  @ApiProperty({
    description: 'Id of your organization inside of Novu',
  })
  _organizationId: string;

  @ApiProperty({
    description: 'Id of your environment inside of your organization in Novu',
  })
  _environmentId: string;
}
