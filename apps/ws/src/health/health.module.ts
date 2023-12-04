import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { SharedModule } from '../shared/shared.module';
import { WSServerHealthIndicator } from '../socket/services';
import { WSGateway } from '../socket/ws.gateway';

const PROVIDERS = [WSServerHealthIndicator, WSGateway];

@Module({
  imports: [TerminusModule, SharedModule],
  providers: PROVIDERS,
  controllers: [HealthController],
})
export class HealthModule {}
