import { ChatProviderIdEnum, PushProviderIdEnum, SubscriberCustomData } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import { ExternalSubscriberId } from './types';

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

  topics?: string[];

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  deleted: boolean;

  createdAt: string;

  updatedAt: string;

  __v?: number;

  isOnline?: boolean;

  lastOnlineAt?: string;

  data?: SubscriberCustomData;

  timezone?: string;
}

export type SubscriberDBModel = ChangePropsValueType<SubscriberEntity, '_environmentId' | '_organizationId'>;

export class IChannelSettings {
  _integrationId: string;

  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  phoneNumber?: string;
  webhookUrl?: string;
  channel?: string;
  deviceTokens?: string[];
}
