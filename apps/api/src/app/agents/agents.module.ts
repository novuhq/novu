import { Module } from '@nestjs/common';
import {
  CalculateDemoClaudeQuota,
  CalculateLimitNovuIntegration,
  CreateOrUpdateSubscriberUseCase,
  UpdateSubscriber,
  UpdateSubscriberChannel,
} from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  ConversationActivityRepository,
  ConversationRepository,
  IntegrationRepository,
  McpConnectionRepository,
  MessageRepository,
  SubscriberRepository,
} from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { ChannelEndpointsModule } from '../channel-endpoints/channel-endpoints.module';
import { ConnectModule } from '../connect/connect.module';
import { EventsModule } from '../events/events.module';
import { KeylessModule } from '../keyless/keyless.module';
import { SharedModule } from '../shared/shared.module';
import { AgentConfigResolver } from './channels/agent-config-resolver.service';
import { AgentIntegrationsController } from './channels/integrations/agent-integrations.controller';
import { AgentsPublicController } from './channels/telegram-linking/agents-public.controller';
import { TelegramMobileLinkTokenService } from './channels/telegram-linking/telegram-mobile-link-token.service';
import { TelegramStartCodeService } from './channels/telegram-linking/telegram-start-code.service';
import { InboundAckService } from './conversation-runtime/ack/inbound-ack.service';
import { AgentActionTokenService } from './conversation-runtime/action-token/agent-action-token.service';
import { AgentAttachmentStorage } from './conversation-runtime/conversation/agent-attachment-storage.service';
import { AgentConversationService } from './conversation-runtime/conversation/agent-conversation.service';
import { AgentSubscriberResolver } from './conversation-runtime/conversation/agent-subscriber-resolver.service';
import { FileMaterializer } from './conversation-runtime/egress/file-materializer.service';
import { OutboundGateway } from './conversation-runtime/egress/outbound.gateway';
import { AgentInboundController } from './conversation-runtime/ingress/agent-inbound.controller';
import { ChatInstanceRegistry } from './conversation-runtime/ingress/chat-instance.registry';
import { InboundDispatcher } from './conversation-runtime/ingress/inbound.dispatcher';
import { AgentInboundHandler } from './conversation-runtime/ingress/inbound-turn.handler';
import { AgentReplyController } from './conversation-runtime/reply/agent-reply.controller';
import { BridgeRuntime } from './conversation-runtime/runtime/bridge.runtime';
import { BridgeExecutorService } from './conversation-runtime/runtime/bridge-executor.service';
import { RuntimeResolver } from './conversation-runtime/runtime/runtime-resolver.service';
import { AgentEmailActionTokenService } from './email/agent-email-action-token.service';
import { AgentEmailActionsController } from './email/agent-email-actions.controller';
import { AgentEmailSender } from './email/agent-email-sender.service';
import { NovuEmailCleanupService } from './email/novu-email/cleanup-novu-email/cleanup-novu-email.service';
import { NovuEmailProvisioningService } from './email/novu-email/find-or-create-novu-email/find-or-create-novu-email.service';
import { DemoClaudeQuotaPolicy } from './managed-runtime/demo-claude-quota-policy.service';
import { ManagedRuntime } from './managed-runtime/managed.runtime';
import { ManagedAgentService } from './managed-runtime/managed-agent.service';
import { ManagedAgentEventHandler } from './managed-runtime/managed-agent-event-handler.service';
import { ManagedAgentProviderFactory } from './managed-runtime/managed-agent-provider-factory.service';
import { ManagedRuntimeController } from './managed-runtime/managed-runtime.controller';
import { AgentRuntimeController } from './management/agent-runtime.controller';
import { AgentsController } from './management/agents.controller';
import { McpNovuAppCredentialsService } from './mcp/connections/get-mcp-novu-app-credentials/get-mcp-novu-app-credentials.service';
import { McpConnectionVaultService } from './mcp/connections/mcp-connection-vault.service';
import { AgentsMcpOAuthController } from './mcp/oauth/agents-mcp-oauth.controller';
import { McpOAuthDiscoveryService } from './mcp/oauth/mcp-oauth-discovery.service';
import { AgentRuntimeExceptionFilter } from './shared/agent-runtime-exception.filter';
import { USE_CASES } from './usecases';

@Module({
  imports: [SharedModule, AuthModule, EventsModule, ChannelEndpointsModule, ConnectModule, KeylessModule],
  controllers: [
    AgentsController,
    AgentIntegrationsController,
    AgentRuntimeController,
    AgentsPublicController,
    AgentInboundController,
    AgentReplyController,
    ManagedRuntimeController,
    AgentEmailActionsController,
    AgentsMcpOAuthController,
  ],
  providers: [
    ...USE_CASES,
    AgentRuntimeExceptionFilter,
    AgentMcpServerRepository,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    CommunityOrganizationRepository,
    ConversationRepository,
    ConversationActivityRepository,
    IntegrationRepository,
    McpConnectionRepository,
    MessageRepository,
    SubscriberRepository,
    AgentAttachmentStorage,
    AgentConfigResolver,
    AgentSubscriberResolver,
    AgentConversationService,
    InboundAckService,
    AgentEmailActionTokenService,
    AgentActionTokenService,
    AgentInboundHandler,
    BridgeExecutorService,
    BridgeRuntime,
    ManagedRuntime,
    RuntimeResolver,
    ManagedAgentProviderFactory,
    ManagedAgentEventHandler,
    ManagedAgentService,
    McpConnectionVaultService,
    NovuEmailCleanupService,
    NovuEmailProvisioningService,
    McpNovuAppCredentialsService,
    DemoClaudeQuotaPolicy,
    ChatInstanceRegistry,
    InboundDispatcher,
    FileMaterializer,
    AgentEmailSender,
    OutboundGateway,
    McpOAuthDiscoveryService,
    TelegramMobileLinkTokenService,
    TelegramStartCodeService,
    CalculateLimitNovuIntegration,
    CalculateDemoClaudeQuota,
    CreateOrUpdateSubscriberUseCase,
    UpdateSubscriber,
    UpdateSubscriberChannel,
  ],
  exports: [...USE_CASES, ChatInstanceRegistry, InboundDispatcher, OutboundGateway],
})
export class AgentsModule {}
