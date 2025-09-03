import { ChannelAddress, ChannelAddressByType, ChannelAddressType, ResourceKey } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ChannelAddressEntity<T extends ChannelAddressType = ChannelAddressType> implements ChannelAddress<T> {
  _id: string;
  identifier: string;

  _integrationId: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _connectionId?: string;

  resource: ResourceKey;

  type: T;
  address: ChannelAddressByType[T];

  createdAt: string;

  updatedAt: string;
}

export type ChannelAddressDBModel = ChangePropsValueType<
  ChannelAddressEntity,
  '_environmentId' | '_organizationId' | '_integrationId' | '_connectionId'
>;
