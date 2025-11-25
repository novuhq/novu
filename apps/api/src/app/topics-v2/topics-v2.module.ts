import { Module } from '@nestjs/common';
import { GetPreferences } from '@novu/application-generic';
import { SharedModule } from '../shared/shared.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TopicsController } from './topics.controller';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, SubscriptionsModule],
  controllers: [TopicsController],
  providers: [...USE_CASES, GetPreferences],
  exports: [...USE_CASES],
})
export class TopicsV2Module {}
