import { forwardRef, Module } from '@nestjs/common';
import {
  CalculateLimitNovuIntegration,
  ChannelFactory,
  CompileTemplate,
  GetNovuProviderCredentials,
  MsTeamsTokenService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { ChannelConnectionsModule } from '../channel-connections/channel-connections.module';
import { ChannelEndpointsModule } from '../channel-endpoints/channel-endpoints.module';
import { SharedModule } from '../shared/shared.module';
import { IntegrationsController } from './integrations.controller';
import { USE_CASES } from './usecases';

const PROVIDERS = [
  ChannelFactory,
  CompileTemplate,
  GetNovuProviderCredentials,
  CalculateLimitNovuIntegration,
  MsTeamsTokenService,
];

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule), ChannelConnectionsModule, ChannelEndpointsModule],
  controllers: [IntegrationsController],
  providers: [...USE_CASES, CommunityOrganizationRepository, CommunityUserRepository, ...PROVIDERS],
  exports: [...USE_CASES],
})
export class IntegrationModule {}
