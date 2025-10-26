import { ChannelTypeEnum, IChannelConnection, ProvidersIdEnum, ResourceKey } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ChannelConnectionEntity implements IChannelConnection {
  _id: string;
  identifier: string;

  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  integrationIdentifier: string;
  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  resource: ResourceKey;

  workspace: { id: string; name?: string };
  auth: { accessToken: string };

  createdAt: string;
  updatedAt: string;
}

export type ChannelConnectionDBModel = ChangePropsValueType<
  ChannelConnectionEntity,
  '_environmentId' | '_organizationId'
>;
