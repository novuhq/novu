import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { SharedModule } from '../shared/shared.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';
import { InboxController } from './inbox.controller';
import { USE_CASES } from './usecases';
import { PreferencesModule } from '../preferences';

@Module({
  imports: [SharedModule, SubscribersV1Module, AuthModule, IntegrationModule, PreferencesModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [InboxController],
})
export class InboxModule {}
