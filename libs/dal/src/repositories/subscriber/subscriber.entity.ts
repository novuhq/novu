import { DirectProviderIdEnum } from '@novu/shared';

export class SubscriberEntity {
  _id?: string;

  firstName: string;

  lastName: string;

  email: string;

  phone?: string;

  avatar?: string;

  subscriberId: string;

  _organizationId: string;

  _environmentId: string;

  channels?: IChannelSettings[];
}

export class IChannelSettings {
  _integrationId: string;

  providerId: DirectProviderIdEnum;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  channelId?: string;

  accessToken?: string;
}
