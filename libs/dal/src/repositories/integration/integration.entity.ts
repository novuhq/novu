import { ChannelTypeEnum } from '@novu/shared';

export interface ICredentials {
  apiKey?: string;
  user?: string;
  secretKey?: string;
  domain?: string;
  password?: string;
  host?: string;
  port?: string;
  secure?: boolean;
  region?: string;
  accountSid?: string;
  messageProfileId?: string;
  token?: string;
  from?: string;
  senderName?: string;
  applicationId?: string;
  clientId?: string;
  projectName?: string;
  serviceAccount?: string;
  applicationCode?: string;
  defaultNotificationTitle?: string;
  triggeredFunction?: any;
  autoSubscribe?: boolean;
  userId?: string;
  tags?: object;
  defaultNotificationImageURL?: string;
}

export class IntegrationEntity {
  _id?: string;

  _environmentId: string;

  _organizationId: string;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  active: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;
}
