import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { ChannelConnectionDBModel, ChannelConnectionEntity } from './channel-connection.entity';
import { ChannelConnection } from './channel-connection.schema';

export class ChannelConnectionRepository extends BaseRepository<
  ChannelConnectionDBModel,
  ChannelConnectionEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(ChannelConnection, ChannelConnectionEntity);
  }
}
