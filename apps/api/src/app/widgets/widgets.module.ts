import { Module } from '@nestjs/common';

import { USE_CASES } from './usecases';
import { WidgetsController } from './widgets.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { IntegrationModule } from '../integrations/integrations.module';

@Module({
  imports: [SharedModule, SubscribersModule, AuthModule, IntegrationModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [WidgetsController],
})
export class WidgetsModule {}
