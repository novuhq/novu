import { DirectIntegrationId } from '../../consts';

export interface IUpdateSubscriberDto {
  subscriberId?: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phone?: string;

  avatar?: string;

  channel?: ISubscriberChannel;
}

export class ISubscriberChannel {
  integrationId: DirectIntegrationId;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  channelId: string;

  accessToken: string;
}

export interface IUpdateSubscriberChannelDto {
  integrationId: DirectIntegrationId;

  credentials: IChannelCredentials;
}
