import { DirectIntegrationId } from '@novu/shared';

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

  channel?: IDirectChannel;
}

export class IDirectChannel {
  integrationId: DirectIntegrationId;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  channelId: string;

  accessToken: string;
}
