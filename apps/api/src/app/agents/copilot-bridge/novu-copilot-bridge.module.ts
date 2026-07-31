import { Module } from '@nestjs/common';
import { GetDecryptedSecretKey, InMemoryLRUCacheService } from '@novu/application-generic';
import { NovuClient, NovuHandler } from '@novu/framework/nest';
import { SharedModule } from '../../shared/shared.module';
import { NovuCopilotBridgeClient } from './novu-copilot-bridge.client';
import { NovuCopilotBridgeController } from './novu-copilot-bridge.controller';

/**
 * Hosts the in-API NovuCopilot agent bridge, isolated from the rest of the agents wiring so its
 * `NovuClient` override (bound to {@link NovuCopilotBridgeClient}) stays scoped to this controller —
 * exactly like {@link NovuBridgeModule} does for the workflow bridge.
 *
 * The agent implementation is loaded lazily from `@novu/ee-ai` inside the client, so this module is
 * safe to register in every build; it responds 404 in OSS/unconfigured deployments.
 */
@Module({
  imports: [SharedModule],
  controllers: [NovuCopilotBridgeController],
  providers: [
    {
      provide: NovuClient,
      useClass: NovuCopilotBridgeClient,
    },
    NovuHandler,
    GetDecryptedSecretKey,
    InMemoryLRUCacheService,
  ],
})
export class NovuCopilotBridgeModule {}
