import { Module } from '@nestjs/common';
import { GetPreferences, UpsertPreferences } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { SharedModule } from '../shared/shared.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { InboxController } from './inbox.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, SubscribersModule, AuthModule, IntegrationModule],
  providers: [...USE_CASES, GetPreferences, UpsertPreferences, PreferencesRepository],
  exports: [...USE_CASES],
  controllers: [InboxController],
})
export class InboxModule {}
