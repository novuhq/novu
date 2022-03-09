import { ChannelTypeEnum } from '@notifire/shared';

interface ICredentials {
  apiKey: string;
  secretKey: string;
}

export class IntegrationEntity {
  _id?: string;

  _applicationId: string;

  _organizationId: string;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  active: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;
}
