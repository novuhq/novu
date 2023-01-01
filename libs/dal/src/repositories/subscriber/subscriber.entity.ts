import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

import { ExternalSubscriberId } from './types';

export class SubscriberEntity {
  // TODO: Use SubscriberId. Means lot of changes across whole codebase. Cool down.
  _id?: string;

  firstName: string;

  lastName: string;

  email: string;

  phone?: string;

  avatar?: string;

  subscriberId: ExternalSubscriberId;

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
