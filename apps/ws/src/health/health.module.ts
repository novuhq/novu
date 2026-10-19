import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from '../shared/shared.module';
import { WSServerHealthIndicator } from '../socket/services';
import { SocketModule } from '../socket/socket.module';
import { HealthController } from './health.controller';

const PROVIDERS = [WSServerHealthIndicator];

@Module({
  imports: [TerminusModule, SharedModule, SocketModule],
  providers: PROVIDERS,
  controllers: [HealthController],
})
export class HealthModule {}
