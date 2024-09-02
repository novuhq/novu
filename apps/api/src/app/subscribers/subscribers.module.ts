import { Module, forwardRef } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { SubscribersController } from './subscribers.controller';
import { AuthModule } from '../auth/auth.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { GetPreferences, UpsertPreferences } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';

@Module({
  imports: [SharedModule, AuthModule, TerminusModule, forwardRef(() => WidgetsModule)],
  controllers: [SubscribersController],
  providers: [...USE_CASES, GetPreferences, UpsertPreferences, PreferencesRepository],
  exports: [...USE_CASES],
})
export class SubscribersModule {}
