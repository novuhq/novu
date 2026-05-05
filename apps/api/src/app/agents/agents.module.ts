import { Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
} from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { SharedModule } from '../shared/shared.module';
import { AgentsController } from './agents.controller';
import { AgentsWebhookController } from './agents-webhook.controller';
import { AgentRuntimeFactory } from './runtimes/agent-runtime.factory';
import { BridgeRuntime } from './runtimes/bridge.runtime';
import { ClaudeManagedRuntime } from './runtimes/claude-managed.runtime';
import { AgentAttachmentStorage } from './services/agent-attachment-storage.service';
import { AgentConfigResolver } from './services/agent-config-resolver.service';
import { AgentConversationService } from './services/agent-conversation.service';
import { AgentInboundHandler } from './services/agent-inbound-handler.service';
import { AgentSubscriberResolver } from './services/agent-subscriber-resolver.service';
import { AnthropicAgentCredentialsService } from './services/anthropic-agent-credentials.service';
import { AnthropicEnvironmentRegistryService } from './services/anthropic-environment-registry.service';
import { AnthropicProvisioningService } from './services/anthropic-provisioning.service';
import { BridgeExecutorService } from './services/bridge-executor.service';
import { ChatSdkService } from './services/chat-sdk.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule, EventsModule],
  controllers: [AgentsController, AgentsWebhookController],
  providers: [
    ...USE_CASES,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    ConversationRepository,
    ConversationActivityRepository,
    AgentAttachmentStorage,
    AgentConfigResolver,
    AgentSubscriberResolver,
    AnthropicAgentCredentialsService,
    AnthropicEnvironmentRegistryService,
    AnthropicProvisioningService,
    AgentConversationService,
    AgentInboundHandler,
    BridgeExecutorService,
    BridgeRuntime,
    ClaudeManagedRuntime,
    AgentRuntimeFactory,
    ChatSdkService,
    ResourceValidatorService,
  ],
  exports: [...USE_CASES, ChatSdkService],
})
export class AgentsModule {}
