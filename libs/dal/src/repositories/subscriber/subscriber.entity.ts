import { Types } from 'mongoose';
import { SubscriberCustomData, ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

import { ExternalSubscriberId } from './types';
import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';

export class SubscriberEntity {
  // TODO: Use SubscriberId. Means lot of changes across whole codebase. Cool down.
  _id: string;

  firstName: string;

  lastName: string;

  email: string;

  phone?: string;

  avatar?: string;

  locale?: string;

  subscriberId: ExternalSubscriberId;

  channels?: IChannelSettings[];

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  deleted: boolean;

  createdAt: string;

  updatedAt: string;

  __v?: number;

  isOnline?: boolean;

  lastOnlineAt?: string;

  data?: SubscriberCustomData;
}

export type SubscriberDBModel = Omit<SubscriberEntity, '_environmentId' | '_organizationId'> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;
};

export class IChannelSettings {
  _integrationId: string;

  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}
