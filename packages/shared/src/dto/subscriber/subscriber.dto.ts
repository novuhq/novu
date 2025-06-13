import { ChatProviderIdEnum, ISubscriberChannel, PushProviderIdEnum } from '../../types';

interface IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
}

interface IChannelSettings {
  _integrationId: string;
  providerId: ChatProviderIdEnum | PushProviderIdEnum;
  credentials: IChannelCredentials;
}

export class SubscriberDto {
  _id: string;
  _organizationId: string;
  _environmentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  subscriberId: string;
  channels?: IChannelSettings[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastOnlineAt?: string;
  data?: Record<string, unknown> | null;
  timezone?: string;
}

export interface ISubscriberFeedResponseDto {
  _id?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriberId: string;
}

export interface ISubscriberResponseDto {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  subscriberId: string;
  channels?: ISubscriberChannel[];
  isOnline?: boolean;
  data?: Record<string, unknown> | null;
  lastOnlineAt?: string;
  _organizationId: string;
  _environmentId: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  timezone?: string;
}

export type SubscribersListResponseDto = {
  data: Array<ISubscriberResponseDto>;
  next: string | null;
  previous: string | null;
};
