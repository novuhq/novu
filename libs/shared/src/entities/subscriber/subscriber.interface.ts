import { ChatProviderIdEnum, PushProviderIdEnum } from '../../consts';
import { SubscriberCustomData } from '../../types';

export interface ISubscriber {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  subscriberId: string;
  channels?: IChannelSettings[];
  _organizationId: string;
  _environmentId: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  data?: SubscriberCustomData;
  __v?: number;
}

export interface IChannelSettings {
  _integrationId: string;
  providerId: ChatProviderIdEnum | PushProviderIdEnum;
  credentials: IChannelCredentials;
}

export interface IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}
