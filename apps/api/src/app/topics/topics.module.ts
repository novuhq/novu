import { Module } from '@nestjs/common';

import { USE_CASES } from './use-cases';
import { TopicsController } from './topics.controller';

import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { SubscribersV1Module } from '../subscribers/subscribersV1.module';

@Module({
  imports: [SharedModule, AuthModule, SubscribersV1Module],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [TopicsController],
})
export class TopicsModule {}
