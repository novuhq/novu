import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectProviderIdEnum, PushProviderIdEnum } from '../../consts';
import { IChannelCredentials } from './update-subscriber.dto';

export class IChannelSettings {
  @ApiProperty()
  _integrationId: string;

  @ApiProperty({
    enum: { ...DirectProviderIdEnum, ...PushProviderIdEnum },
  })
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty()
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
  })
  channels?: IChannelSettings[];

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;
}
