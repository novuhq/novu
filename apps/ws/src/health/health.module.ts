import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { SharedModule } from '../shared/shared.module';

const PROVIDERS = [];

@Module({
  imports: [TerminusModule, SharedModule],
  providers: PROVIDERS,
  controllers: [HealthController],
})
export class HealthModule {}
