import { Module } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
  EnvironmentRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { ConnectController } from './connect.controller';
import { ConnectClaimTokenService } from './services/connect-claim-token.service';
import { ClaimKeylessConnect } from './usecases/claim-keyless-connect/claim-keyless-connect.usecase';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [ConnectController],
  providers: [
    ConnectClaimTokenService,
    ClaimKeylessConnect,
    AgentRepository,
    AgentIntegrationRepository,
    IntegrationRepository,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    ConversationRepository,
    ConversationActivityRepository,
    SubscriberRepository,
    EnvironmentRepository,
  ],
  exports: [ConnectClaimTokenService],
})
export class ConnectModule {}
