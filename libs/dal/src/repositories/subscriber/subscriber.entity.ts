import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export type SubscriberId = string;

export class SubscriberEntity {
  _id?: SubscriberId;

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

export class IChannelSettings {
  _integrationId: string;

  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}
