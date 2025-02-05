import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import {
  EventsDistributedLockService,
  GetNovuProviderCredentials,
  StorageHelperService,
} from '@novu/application-generic';

import { EventsController } from './events.controller';
import { USE_CASES } from './usecases';

import { SharedModule } from '../shared/shared.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { AuthModule } from '../auth/auth.module';
import { ContentTemplatesModule } from '../content-templates/content-templates.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { ExecutionDetailsModule } from '../execution-details/execution-details.module';
import { TopicsModule } from '../topics/topics.module';
import { LayoutsModule } from '../layouts/layouts.module';
import { TenantModule } from '../tenant/tenant.module';
import { BridgeModule } from '../bridge';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';

const PROVIDERS = [GetNovuProviderCredentials, StorageHelperService, EventsDistributedLockService];

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
    TopicsModule,
    LayoutsModule,
    TenantModule,
    BridgeModule,
  ],
  controllers: [EventsController],
  providers: [...PROVIDERS, ...USE_CASES],
})
export class EventsModule {}
