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

  channels?: IDirectChannel[];
}

export class IDirectChannel {
  _integrationId: string;

  integrationId: DirectIntegrationId;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  channelId: string;

  accessToken: string;
}
