import { ChannelTypeEnum, EnvironmentId, OrganizationId, ProvidersIdEnum, ResourceKey } from '../../types';

export interface IChannelConnection {
  _id: string;
  identifier: string;

  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  integrationIdentifier: string;
  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  resource?: ResourceKey;
  contextKeys: string[];

  workspace: { id: string; name?: string };
  auth: { accessToken: string };

  createdAt: string;
  updatedAt: string;
}
