import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { SharedModule } from '../shared/shared.module';
import { WSServerHealthIndicator } from '../socket/services';
import { SocketModule } from '../socket/socket.module';

const PROVIDERS = [WSServerHealthIndicator];

@Module({
  imports: [TerminusModule, SharedModule, SocketModule],
  providers: PROVIDERS,
  controllers: [HealthController],
})
export class HealthModule {}
