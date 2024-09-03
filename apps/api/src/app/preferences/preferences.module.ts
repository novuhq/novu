import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GetPreferences, UpsertPreferences } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { PreferencesController } from './preferences.controller';

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
