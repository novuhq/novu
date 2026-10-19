import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { HealthController } from './health.controller';

@Module({
  imports: [SharedModule, TerminusModule],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
