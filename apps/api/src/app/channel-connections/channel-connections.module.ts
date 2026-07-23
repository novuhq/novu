import { Module } from '@nestjs/common';
import {
  analyticsService,
  CreateOrUpdateSubscriberUseCase,
  featureFlagsService,
  RotatingConnectionTokenService,
  UpdateSubscriber,
  UpdateSubscriberChannel,
} from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  CommunityOrganizationRepository,
  ContextRepository,
  EnvironmentRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { ChannelConnectionsController } from './channel-connections.controller';
import { CreateChannelConnection } from './usecases/create-channel-connection/create-channel-connection.usecase';
import { DeleteChannelConnection } from './usecases/delete-channel-connection/delete-channel-connection.usecase';
import { GetChannelConnection } from './usecases/get-channel-connection/get-channel-connection.usecase';
import { ListChannelConnections } from './usecases/list-channel-connections/list-channel-connections.usecase';
import { UpdateChannelConnection } from './usecases/update-channel-connection/update-channel-connection.usecase';
import { VerifyChannelConnection } from './usecases/verify-channel-connection/verify-channel-connection.usecase';

const USE_CASES = [
  GetChannelConnection,
  ListChannelConnections,
  CreateChannelConnection,
  UpdateChannelConnection,
  DeleteChannelConnection,
  VerifyChannelConnection,
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
  imports: [SharedModule],
  controllers: [ChannelConnectionsController],
  providers: [
    ...USE_CASES,
    ...DAL_MODELS,
    featureFlagsService,
    analyticsService,
    CreateOrUpdateSubscriberUseCase,
    UpdateSubscriber,
    UpdateSubscriberChannel,
    RotatingConnectionTokenService,
  ],
  exports: [...USE_CASES, ...DAL_MODELS],
})
export class ChannelConnectionsModule {}
