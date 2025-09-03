import { EnvironmentId } from './environment';
import { OrganizationId } from './organization';
import { ResourceKey } from './resource-key';

export const ADDRESS_TYPES = {
  SLACK_CHANNEL: 'slack_channel',
  SLACK_USER: 'slack_user',
  RC_ROOM: 'rc_room',
  WEBHOOK: 'webhook',
} as const;

export type ChannelAddressType = (typeof ADDRESS_TYPES)[keyof typeof ADDRESS_TYPES];

export type ChannelAddressByType = {
  [ADDRESS_TYPES.SLACK_CHANNEL]: { channelId: string };
  [ADDRESS_TYPES.SLACK_USER]: { userId: string };
  [ADDRESS_TYPES.RC_ROOM]: { roomId: string };
  [ADDRESS_TYPES.WEBHOOK]: { url: string };
};

export type ChannelAddress<T extends ChannelAddressType = ChannelAddressType> = {
  identifier: string;

  // context
  _integrationId: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _connectionId?: string; // used for oauth providers with tenant-like flows

  resource: ResourceKey;

  type: T;
  address: ChannelAddressByType[T];

  createdAt: string;
  updatedAt: string;
};
