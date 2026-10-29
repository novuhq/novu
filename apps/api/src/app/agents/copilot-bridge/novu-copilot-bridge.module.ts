import { Module } from '@nestjs/common';
import { NovuClient, NovuHandler } from '@novu/framework/nest';
import { NovuAgentsBridgeModule } from '../novu-agents-bridge/novu-agents-bridge.module';
import { NovuCopilotBridgeClient } from './novu-copilot-bridge.client';
import { NovuCopilotBridgeController } from './novu-copilot-bridge.controller';

/**
 * Hosts the deprecated `/novu/bridge` alias of the `/bridge/novu` agents bridge, isolated so its
 * `NovuClient` override (bound to {@link NovuCopilotBridgeClient}) stays scoped to this controller.
 *
 * The agents come from {@link NovuAgentsBridgeService}, which loads `@novu/ee-agents` lazily, so this
 * module is safe to register in every build; it responds 404 in OSS/unconfigured deployments.
 */
@Module({
  imports: [NovuAgentsBridgeModule],
  controllers: [NovuCopilotBridgeController],
  providers: [
    {
      provide: NovuClient,
      useClass: NovuCopilotBridgeClient,
    },
    NovuHandler,
  ],
})
export class NovuCopilotBridgeModule {}
