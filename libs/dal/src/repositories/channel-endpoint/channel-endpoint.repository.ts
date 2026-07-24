import type { ChannelEndpointType } from '@novu/shared';
import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { ChannelEndpointDBModel, ChannelEndpointEntity } from './channel-endpoint.entity';
import { ChannelEndpoint } from './channel-endpoint.schema';

export class ChannelEndpointRepository extends BaseRepository<
  ChannelEndpointDBModel,
  ChannelEndpointEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(ChannelEndpoint, ChannelEndpointEntity);
  }

  async findByPlatformIdentity(params: {
    _environmentId: string;
    _organizationId: string;
    integrationIdentifier: string;
    type: ChannelEndpointType;
    endpointField: string;
    endpointValue: string;
    /**
     * Optional workspace scoping. In the hosted multi-tenant app the same platform
     * user (e.g. a Slack `userId`) can be linked under several customer connections
     * within Novu's shared env/integration; passing the workspace's
     * `connectionIdentifier` keeps the lookup from returning another tenant's endpoint.
     */
    connectionIdentifier?: string;
  }): Promise<ChannelEndpointEntity | null> {
    return this.findOne({
      _environmentId: params._environmentId,
      _organizationId: params._organizationId,
      integrationIdentifier: params.integrationIdentifier,
      type: params.type,
      [`endpoint.${params.endpointField}`]: params.endpointValue,
      ...(params.connectionIdentifier ? { connectionIdentifier: params.connectionIdentifier } : {}),
    });
  }
}
