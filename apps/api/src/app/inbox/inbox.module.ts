import { Module } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { OrganizationModule } from '../organization/organization.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { PreferencesModule } from '../preferences';
import { SharedModule } from '../shared/shared.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';
import { InboxController } from './inbox.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [
    SharedModule,
    SubscribersV1Module,
    AuthModule,
    IntegrationModule,
    PreferencesModule,
    OrganizationModule,
    OutboundWebhooksModule.forRoot(),
  ],
  providers: [...USE_CASES, CommunityOrganizationRepository],
  exports: [...USE_CASES],
  controllers: [InboxController],
})
export class InboxModule {}
