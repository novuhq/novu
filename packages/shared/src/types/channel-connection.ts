import { ChannelTypeEnum } from './channel';
import { EnvironmentId } from './environment';
import { OrganizationId } from './organization';
import { ProvidersIdEnum } from './providers';

export type ChannelConnection = {
  _id: string;
  identifier: string;

  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  integrationIdentifier: string;
  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  subscriberId?: string;
  contextKeys: string[];

  workspace: { id: string; name?: string };
  auth: { accessToken: string };

  createdAt: string;
  updatedAt: string;
};
