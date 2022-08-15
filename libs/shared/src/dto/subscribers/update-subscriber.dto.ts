import { ChatProviderIdEnum, PushProviderIdEnum } from '../../consts';

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
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  webhookUrl?: string;
  notificationIdentifiers?: string[];
}

export interface IUpdateSubscriberChannelDto {
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}
