import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, TerminusModule],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
