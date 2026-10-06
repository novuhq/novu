import type {
  ChannelEndpoint,
  ChannelEndpointByType,
  ChannelEndpointType,
  ChannelTypeEnum,
  ProvidersIdEnum,
} from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ChannelEndpointEntity<T extends ChannelEndpointType = ChannelEndpointType> implements ChannelEndpoint<T> {
  _id: string;
  identifier: string;

  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  connectionIdentifier?: string;
  integrationIdentifier: string;

  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  subscriberId: string;
  contextKeys: string[];
  type: T;
  endpoint: ChannelEndpointByType[T];

  createdAt: string;
  updatedAt: string;
}

export type ChannelEndpointDBModel = ChangePropsValueType<ChannelEndpointEntity, '_environmentId' | '_organizationId'>;
