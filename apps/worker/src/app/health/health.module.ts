import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { QueuesModule } from '@novu/application-generic';

import { HealthController } from './health.controller';

import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, TerminusModule, QueuesModule],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
