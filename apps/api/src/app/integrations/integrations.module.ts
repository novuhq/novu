import { forwardRef, Module } from '@nestjs/common';
import {
  analyticsService,
  CalculateLimitNovuIntegration,
  ChannelFactory,
  CompileTemplate,
  CreateOrUpdateSubscriberUseCase,
  GetNovuProviderCredentials,
  MsTeamsTokenService,
  UpdateSubscriber,
  UpdateSubscriberChannel,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, CommunityUserRepository, IntegrationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { ChannelConnectionsModule } from '../channel-connections/channel-connections.module';
import { ChannelEndpointsModule } from '../channel-endpoints/channel-endpoints.module';
import { SharedModule } from '../shared/shared.module';
import { TelegramLinkingModule } from '../telegram-linking/telegram-linking.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsMobileConfigurePublicController } from './integrations-mobile-configure-public.controller';
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
    TelegramLinkingModule,
  ],
  controllers: [IntegrationsController, IntegrationsPublicController, IntegrationsMobileConfigurePublicController],
  providers: [
    ...USE_CASES,
    CommunityOrganizationRepository,
    CommunityUserRepository,
    IntegrationRepository,
    ...PROVIDERS,
    analyticsService,
    CreateOrUpdateSubscriberUseCase,
    UpdateSubscriber,
    UpdateSubscriberChannel,
  ],
  exports: [...USE_CASES],
})
export class IntegrationModule {}
