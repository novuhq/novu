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

  buildContextExactMatchQuery(contextKeys?: string[]) {
    // empty array = no context, only match connections with no context
    if (contextKeys === undefined || contextKeys.length === 0) {
      return { contextKeys: [] };
    }

    // non-empty array = exact match filtering (order-insensitive)
    return {
      contextKeys: { $all: contextKeys, $size: contextKeys.length },
    };
  }
}
