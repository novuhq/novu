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
}
