import { Module } from '@nestjs/common';

import { USE_CASES } from './use-cases';
import { TopicsController } from './topics.controller';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersModule } from '../subscribers/subscribers.module';

@Module({
  imports: [SharedModule, AuthModule, SubscribersModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [TopicsController],
})
export class TopicsModule {}
