import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { PreferencesController } from './preferences.controller';
import { SharedModule } from '../shared/shared.module';
import { PreferencesRepository } from '@novu/dal';
import { GetPreferences, UpsertPreferences } from '@novu/application-generic';

const PROVIDERS = [PreferencesRepository, UpsertPreferences, GetPreferences];

@Module({
  imports: [SharedModule],
  providers: [...PROVIDERS],
  controllers: [PreferencesController],
  exports: [],
})
export class PreferencesModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {}
}
