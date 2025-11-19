import { forwardRef, Module } from '@nestjs/common';
import {
  CalculateLimitNovuIntegration,
  ChannelFactory,
  CompileTemplate,
  GetNovuProviderCredentials,
} from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  CommunityUserRepository,
  ContextRepository,
} from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { IntegrationsController } from './integrations.controller';
import { USE_CASES } from './usecases';

const PROVIDERS = [ChannelFactory, CompileTemplate, GetNovuProviderCredentials, CalculateLimitNovuIntegration];

@Module({
  imports: [SharedModule, forwardRef(() => AuthModule)],
  controllers: [IntegrationsController],
  providers: [
    ...USE_CASES,
    CommunityOrganizationRepository,
    CommunityUserRepository,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    ContextRepository,
    ...PROVIDERS,
  ],
  exports: [...USE_CASES],
})
export class IntegrationModule {}
