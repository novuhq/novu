import { forwardRef, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';

import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';
import { PreferencesModule } from '../preferences';
import { SharedModule } from '../shared/shared.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { SubscribersV1Controller } from './subscribersV1.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    TerminusModule,
    forwardRef(() => WidgetsModule),
    PreferencesModule,
    OutboundWebhooksModule.forRoot(),
  ],
  controllers: [SubscribersV1Controller],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class SubscribersV1Module {}
