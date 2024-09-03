import { forwardRef, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { GetPreferences, UpsertPreferences } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { SubscribersController } from './subscribers.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule, TerminusModule, forwardRef(() => WidgetsModule)],
  controllers: [SubscribersController],
  providers: [...USE_CASES, GetPreferences, UpsertPreferences, PreferencesRepository],
  exports: [...USE_CASES],
})
export class SubscribersModule {}
