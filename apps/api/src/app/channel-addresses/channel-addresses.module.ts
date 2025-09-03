import { Module } from '@nestjs/common';
import { featureFlagsService } from '@novu/application-generic';
import {
  ChannelAddressRepository,
  ChannelConnectionRepository,
  CommunityOrganizationRepository,
  EnvironmentRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { CreateChannelAddress } from './usecases/create-channel-address/create-channel-address.usecase';
import { DeleteChannelAddress } from './usecases/delete-channel-address/delete-channel-address.usecase';
import { GetChannelAddress } from './usecases/get-channel-address/get-channel-address.usecase';
import { GetChannelAddresses } from './usecases/get-channel-addresses/get-channel-addresses.usecase';
import { UpdateChannelAddress } from './usecases/update-channel-address/update-channel-address.usecase';

const USE_CASES = [
  GetChannelAddresses,
  GetChannelAddress,
  CreateChannelAddress,
  UpdateChannelAddress,
  DeleteChannelAddress,
];

const DAL_MODELS = [
  ChannelAddressRepository,
  ChannelConnectionRepository,
  SubscriberRepository,
  IntegrationRepository,
  EnvironmentRepository,
  CommunityOrganizationRepository,
];

@Module({
  providers: [...USE_CASES, ...DAL_MODELS, featureFlagsService],
  exports: [...USE_CASES],
})
export class ChannelAddressesModule {}
