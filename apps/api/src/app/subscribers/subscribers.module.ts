import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, TerminusModule],
  controllers: [],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class SubscribersModule {}
