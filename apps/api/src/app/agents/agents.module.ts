import { Module } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
  SubscriberAgentVaultRepository,
} from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { SharedModule } from '../shared/shared.module';
import { AgentsController } from './agents.controller';
import { AgentsMcpOauthController } from './agents-mcp-oauth.controller';
import { AgentsMcpSubscriberController } from './agents-mcp-subscriber.controller';
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
import { McpOauthExchangeService } from './services/mcp-oauth-exchange.service';
import { McpOauthSigningService } from './services/mcp-oauth-signing.service';
import { OrgAnthropicVaultService } from './services/org-anthropic-vault.service';
import { SubscriberAnthropicVaultService } from './services/subscriber-anthropic-vault.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule, EventsModule],
  controllers: [AgentsController, AgentsWebhookController, AgentsMcpOauthController, AgentsMcpSubscriberController],
  providers: [
    ...USE_CASES,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    ConversationRepository,
    ConversationActivityRepository,
    SubscriberAgentVaultRepository,
    AgentAttachmentStorage,
    AgentConfigResolver,
    AgentSubscriberResolver,
    AnthropicAgentCredentialsService,
    AnthropicEnvironmentRegistryService,
    AnthropicProvisioningService,
    OrgAnthropicVaultService,
    SubscriberAnthropicVaultService,
    McpOauthSigningService,
    McpOauthExchangeService,
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
