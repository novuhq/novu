import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { GetNovuProviderCredentials, StorageHelperService } from '@novu/application-generic';

import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { EventsController } from './events.controller';
import { USE_CASES } from './usecases';

import { AuthModule } from '../auth/auth.module';
import { BridgeModule } from '../bridge';
import { ContentTemplatesModule } from '../content-templates/content-templates.module';
import { ExecutionDetailsModule } from '../execution-details/execution-details.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { LayoutsModule } from '../layouts/layouts.module';
import { SharedModule } from '../shared/shared.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';
import { TenantModule } from '../tenant/tenant.module';
import { WidgetsModule } from '../widgets/widgets.module';

const PROVIDERS = [GetNovuProviderCredentials, StorageHelperService, CommunityOrganizationRepository];

@Module({
  imports: [
    SharedModule,
    TerminusModule,
    WidgetsModule,
    AuthModule,
    SubscribersV1Module,
    ContentTemplatesModule,
    IntegrationModule,
    ExecutionDetailsModule,
    LayoutsModule,
    TenantModule,
    BridgeModule,
  ],
  controllers: [EventsController],
  providers: [...PROVIDERS, ...USE_CASES, CommunityUserRepository],
})
export class EventsModule {}
