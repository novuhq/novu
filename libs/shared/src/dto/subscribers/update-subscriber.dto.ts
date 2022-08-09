import { ApiProperty } from '@nestjs/swagger';
import { DirectProviderIdEnum, PushProviderIdEnum } from '../../consts';

export interface IUpdateSubscriberDto {
  subscriberId?: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phone?: string;

  avatar?: string;

  channels?: ISubscriberChannel[];
}

export class IChannelCredentials {
  @ApiProperty()
  webhookUrl?: string;
  @ApiProperty()
  notificationIdentifiers?: string[];
}

export class ISubscriberChannel {
  @ApiProperty()
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty()
  credentials: IChannelCredentials;
}

export interface IUpdateSubscriberChannelDto {
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}
