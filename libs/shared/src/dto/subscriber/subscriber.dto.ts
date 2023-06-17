import { ChatProviderIdEnum, PushProviderIdEnum } from '../../consts';
import { SubscriberCustomData } from '../../entities/subscriber';
import { EnvironmentId, ExternalSubscriberId, OrganizationId } from '../../types';

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
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  subscriberId: ExternalSubscriberId;
  channels?: IChannelSettings[];
  deleted: boolean;
}

export interface ISubscriberPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: SubscriberCustomData;
  [key: string]: string | string[] | boolean | number | SubscriberCustomData | undefined;
}

export interface ISubscribersDefine extends ISubscriberPayload {
  subscriberId: string;
}
