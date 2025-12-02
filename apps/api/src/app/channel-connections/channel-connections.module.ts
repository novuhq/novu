import { Module } from '@nestjs/common';
import { featureFlagsService } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  CommunityOrganizationRepository,
  ContextRepository,
  EnvironmentRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelConnectionsController } from './channel-connections.controller';
import { CreateChannelConnection } from './usecases/create-channel-connection/create-channel-connection.usecase';
import { DeleteChannelConnection } from './usecases/delete-channel-connection/delete-channel-connection.usecase';
import { GetChannelConnection } from './usecases/get-channel-connection/get-channel-connection.usecase';
import { ListChannelConnections } from './usecases/list-channel-connections/list-channel-connections.usecase';
import { UpdateChannelConnection } from './usecases/update-channel-connection/update-channel-connection.usecase';

const USE_CASES = [
  GetChannelConnection,
  ListChannelConnections,
  CreateChannelConnection,
  UpdateChannelConnection,
  DeleteChannelConnection,
];

const DAL_MODELS = [
  ChannelConnectionRepository,
  SubscriberRepository,
  IntegrationRepository,
  EnvironmentRepository,
  CommunityOrganizationRepository,
  ContextRepository,
];

@Module({
  controllers: [ChannelConnectionsController],
  providers: [...USE_CASES, ...DAL_MODELS, featureFlagsService],
  exports: [...USE_CASES, ...DAL_MODELS],
})
export class ChannelConnectionsModule {}
