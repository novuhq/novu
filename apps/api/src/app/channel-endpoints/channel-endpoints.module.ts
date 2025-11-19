import { Module } from '@nestjs/common';
import { featureFlagsService } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  ContextRepository,
  EnvironmentRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelEndpointsController } from './channel-endpoints.controller';
import { CreateChannelEndpoint } from './usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { DeleteChannelEndpoint } from './usecases/delete-channel-endpoint/delete-channel-endpoint.usecase';
import { GetChannelEndpoint } from './usecases/get-channel-endpoint/get-channel-endpoint.usecase';
import { ListChannelEndpoints } from './usecases/list-channel-endpoints/list-channel-endpoints.usecase';
import { UpdateChannelEndpoint } from './usecases/update-channel-endpoint/update-channel-endpoint.usecase';

const USE_CASES = [
  ListChannelEndpoints,
  GetChannelEndpoint,
  CreateChannelEndpoint,
  UpdateChannelEndpoint,
  DeleteChannelEndpoint,
];

const DAL_MODELS = [
  ChannelEndpointRepository,
  ChannelConnectionRepository,
  SubscriberRepository,
  IntegrationRepository,
  EnvironmentRepository,
  CommunityOrganizationRepository,
  ContextRepository,
];

@Module({
  controllers: [ChannelEndpointsController],
  providers: [...USE_CASES, ...DAL_MODELS, featureFlagsService],
  exports: [...USE_CASES, ...DAL_MODELS],
})
export class ChannelEndpointsModule {}
