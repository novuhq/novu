import { Module } from '@nestjs/common';

import { USE_CASES } from './usecases';
import { InboxController } from './inbox.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { GetPreferences, UpsertPreferences } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';

@Module({
  imports: [SharedModule, SubscribersModule, AuthModule, IntegrationModule],
  providers: [...USE_CASES, GetPreferences, UpsertPreferences, PreferencesRepository],
  exports: [...USE_CASES],
  controllers: [InboxController],
})
export class InboxModule {}
