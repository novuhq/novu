import type { ChannelConnection, ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ChannelConnectionEntity implements ChannelConnection {
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
}

export type ChannelConnectionDBModel = ChangePropsValueType<
  ChannelConnectionEntity,
  '_environmentId' | '_organizationId'
>;
