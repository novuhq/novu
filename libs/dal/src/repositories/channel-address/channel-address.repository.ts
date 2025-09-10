import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { ChannelAddressDBModel, ChannelAddressEntity } from './channel-address.entity';
import { ChannelAddress } from './channel-address.schema';

export class ChannelAddressRepository extends BaseRepository<
  ChannelAddressDBModel,
  ChannelAddressEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(ChannelAddress, ChannelAddressEntity);
  }
}
