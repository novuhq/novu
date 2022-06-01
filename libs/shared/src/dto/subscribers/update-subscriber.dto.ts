import { DirectProviderIdEnum } from '../../consts';

export interface IUpdateSubscriberDto {
  subscriberId?: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phone?: string;

  avatar?: string;
}

export class ISubscriberChannel {
  providerId: DirectProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  webhookUrl: string;
}

export interface IUpdateSubscriberChannelDto {
  providerId: DirectProviderIdEnum;

  credentials: IChannelCredentials;
}
