import { ChatProviderIdEnum, PushProviderIdEnum } from '../../consts';

export interface ISubscriber {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  subscriberId: string;
  channels?: IChannelSettings[];
  _organizationId: string;
  _environmentId: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
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
