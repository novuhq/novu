import { ChatProviderIdEnum, PushProviderIdEnum } from '../../consts';
import { EnvironmentId, ExternalSubscriberId, OrganizationId, SubscriberCustomData } from '../../types';

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
