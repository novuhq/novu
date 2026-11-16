import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { NovuAgentsBridgeService } from './novu-agents-bridge.service';

/**
 * Holds the single {@link NovuAgentsBridgeService} shared by the `/bridge/novu` bridge and the
 * deprecated `/novu/bridge` alias, so the agents are built once.
 */
@Module({
  imports: [SharedModule],
  providers: [NovuAgentsBridgeService],
  exports: [NovuAgentsBridgeService],
})
export class NovuAgentsBridgeModule {}
