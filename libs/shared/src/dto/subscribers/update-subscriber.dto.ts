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

export class ISubscriberChannel {
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  webhookUrl?: string;
  notificationIdentifiers?: string[];
}

export interface IUpdateSubscriberChannelDto {
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}
