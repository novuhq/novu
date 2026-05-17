import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  CalculateLimitNovuIntegration,
  ChannelFactory,
  CompileTemplate,
  GetNovuProviderCredentials,
  MsTeamsTokenService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { TelegramMobileLinkTokenService } from '../agents/services/telegram-mobile-link-token.service';
import { AuthModule } from '../auth/auth.module';
import { ChannelConnectionsModule } from '../channel-connections/channel-connections.module';
import { ChannelEndpointsModule } from '../channel-endpoints/channel-endpoints.module';
import { SharedModule } from '../shared/shared.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsPublicController } from './integrations-public.controller';
import { USE_CASES } from './usecases';

const PROVIDERS = [
  ChannelFactory,
  CompileTemplate,
  GetNovuProviderCredentials,
  CalculateLimitNovuIntegration,
  MsTeamsTokenService,
];

@Module({
  imports: [
    SharedModule,
    forwardRef(() => AuthModule),
    ChannelConnectionsModule,
    ChannelEndpointsModule,
    // Local JwtModule mirroring AgentsModule's registration. Importing AgentsModule
    // here would form a cycle (IntegrationModule → AgentsModule → EventsModule →
    // IntegrationModule) that needs forwardRef on every edge; registering the
    // token service locally is simpler and safe since it is stateless and the
    // JTI cache is shared via Redis.
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [IntegrationsController, IntegrationsPublicController],
  providers: [
    ...USE_CASES,
    CommunityOrganizationRepository,
    CommunityUserRepository,
    TelegramMobileLinkTokenService,
    ...PROVIDERS,
  ],
  exports: [...USE_CASES],
})
export class IntegrationModule {}
