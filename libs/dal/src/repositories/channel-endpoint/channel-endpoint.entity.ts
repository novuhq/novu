import { ChannelEndpointRouting, ExternalSubscriberId } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ChannelEndpointEntity {
  _id: string;

  identifier: string;

  _integrationId: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  subscriberId: ExternalSubscriberId;

  endpoint: string;

  routing: ChannelEndpointRouting;

  deleted: boolean;

  createdAt: string;

  updatedAt: string;
}

export type ChannelEndpointDBModel = ChangePropsValueType<
  ChannelEndpointEntity,
  '_environmentId' | '_organizationId' | '_integrationId'
>;
