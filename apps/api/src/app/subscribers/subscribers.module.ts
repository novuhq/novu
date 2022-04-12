import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { SubscribersController } from './subscribers.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule, TerminusModule],
  controllers: [SubscribersController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class SubscribersModule {}
