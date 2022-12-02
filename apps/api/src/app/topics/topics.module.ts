import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { USE_CASES } from './use-cases';
import { TopicsController } from './topics.controller';

@Module({
  imports: [SharedModule, AuthModule],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
  controllers: [TopicsController],
})
export class TopicsModule {}
