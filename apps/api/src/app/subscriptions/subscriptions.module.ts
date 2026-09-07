import { Module } from '@nestjs/common';
import { GetPreferences } from '@novu/application-generic';
import { ContextRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES, GetPreferences, ContextRepository],
  exports: [...USE_CASES],
})
export class SubscriptionsModule {}
