import {
  ChannelEndpointByType,
  ChannelEndpointType,
  ChannelTypeEnum,
  EnvironmentId,
  OrganizationId,
  ProvidersIdEnum,
  ResourceKey,
} from '../../types';

export interface IChannelEndpoint<T extends ChannelEndpointType = ChannelEndpointType> {
  identifier: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  connectionIdentifier?: string; // used for oauth providers with tenant-like flows
  integrationIdentifier: string;

  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  resource: ResourceKey;
  contextKeys: string[];
  type: T;
  endpoint: ChannelEndpointByType[T];

  createdAt: string;
  updatedAt: string;
}
