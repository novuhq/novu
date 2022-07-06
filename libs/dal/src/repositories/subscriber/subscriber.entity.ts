import { DirectProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class SubscriberEntity {
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
}

export class IChannelSettings {
  _integrationId: string;

  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  webhookUrl?: string;
  notificationIdentifiers?: string[];
}
