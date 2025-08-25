import { Module } from '@nestjs/common';
import { featureFlagsService } from '@novu/application-generic';
import {
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  EnvironmentRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelEndpointsController } from './channel-endpoints.controller';
import { CreateChannelEndpoint } from './usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { DeleteChannelEndpoint } from './usecases/delete-channel-endpoint/delete-channel-endpoint.usecase';
import { GetChannelEndpoint } from './usecases/get-channel-endpoint/get-channel-endpoint.usecase';
import { GetChannelEndpoints } from './usecases/get-channel-endpoints/get-channel-endpoints.usecase';
import { UpdateChannelEndpoint } from './usecases/update-channel-endpoint/update-channel-endpoint.usecase';

const USE_CASES = [
  GetChannelEndpoints,
  GetChannelEndpoint,
  CreateChannelEndpoint,
  UpdateChannelEndpoint,
  DeleteChannelEndpoint,
];

const DAL_MODELS = [
  ChannelEndpointRepository,
  SubscriberRepository,
  IntegrationRepository,
  EnvironmentRepository,
  CommunityOrganizationRepository,
];

@Module({
  controllers: [ChannelEndpointsController],
  providers: [...USE_CASES, ...DAL_MODELS, featureFlagsService],
  exports: [...USE_CASES],
})
export class ChannelEndpointsModule {}
