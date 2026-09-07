import { forwardRef, Module } from '@nestjs/common';

import { CommunityOrganizationRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { SharedModule } from '../shared/shared.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';
import { USE_CASES } from './usecases';
import { WidgetsController } from './widgets.controller';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => SubscribersV1Module),
    AuthModule,
    IntegrationModule,
    OutboundWebhooksModule.forRoot(),
  ],
  providers: [...USE_CASES, CommunityOrganizationRepository],
  exports: [...USE_CASES],
  controllers: [WidgetsController],
})
export class WidgetsModule {}
