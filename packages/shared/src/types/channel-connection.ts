import { EnvironmentId } from './environment';
import { OrganizationId } from './organization';
import { ResourceKey } from './resource-key';

export type ChannelConnection = {
  _id: string;
  identifier: string;

  _integrationId: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  resource: ResourceKey;

  workspace: { id: string; name?: string };
  auth: { accessToken: string };

  createdAt: string;
  updatedAt: string;
};
