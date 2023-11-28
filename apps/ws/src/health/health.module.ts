import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { QueuesModule } from '@novu/application-generic';

import { HealthController } from './health.controller';
import { SharedModule } from '../shared/shared.module';
import { WSGateway } from '../socket/ws.gateway';
import { WSHealthIndicator } from '../socket/services';

const PROVIDERS = [WSHealthIndicator, WSGateway];

@Module({
  imports: [TerminusModule, SharedModule, QueuesModule],
  providers: PROVIDERS,
  controllers: [HealthController],
})
export class HealthModule {}
