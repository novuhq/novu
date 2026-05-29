import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
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
  ConversationActivityRepository,
  ConversationRepository,
  IntegrationRepository,
  McpConnectionRepository,
  MessageRepository,
  SubscriberRepository,
} from '@novu/dal';

import { AuthModule } from '../auth/auth.module';
import { ChannelEndpointsModule } from '../channel-endpoints/channel-endpoints.module';
import { EventsModule } from '../events/events.module';
import { SharedModule } from '../shared/shared.module';
import { AgentEmailActionsController } from './agent-email-actions.controller';
import { AgentsController } from './agents.controller';
import { AgentsMcpOAuthController } from './agents-mcp-oauth.controller';
import { AgentsPublicController } from './agents-public.controller';
import { AgentsWebhookController } from './agents-webhook.controller';
import { ChatChannelFactory } from './conversation-runtime/channels/chat.channel';
import { EmailChannelFactory } from './conversation-runtime/channels/email.channel';
import { FileMaterializer } from './conversation-runtime/egress/file-materializer.service';
import { OutboundGateway } from './conversation-runtime/egress/outbound.gateway';
import { ChatInstanceRegistry } from './conversation-runtime/ingress/chat-instance.registry';
import { InboundDispatcher } from './conversation-runtime/ingress/inbound.dispatcher';
import { AgentEmailSender } from './email/agent-email-sender.service';
import { AgentRuntimeExceptionFilter } from './filters/agent-runtime-exception.filter';
import { AgentAttachmentStorage } from './services/agent-attachment-storage.service';
import { AgentConfigResolver } from './services/agent-config-resolver.service';
import { AgentConversationService } from './services/agent-conversation.service';
import { AgentEmailActionTokenService } from './services/agent-email-action-token.service';
import { AgentInboundHandler } from './services/agent-inbound-handler.service';
import { AgentSubscriberResolver } from './services/agent-subscriber-resolver.service';
import { BridgeExecutorService } from './services/bridge-executor.service';
import { DemoClaudeQuotaPolicy } from './services/demo-claude-quota-policy.service';
import { ManagedAgentService } from './services/managed-agent.service';
import { ManagedAgentEventHandler } from './services/managed-agent-event-handler';
import { ManagedAgentProviderFactory } from './services/managed-agent-provider-factory';
import { McpConnectionVaultService } from './services/mcp-connection-vault.service';
import { McpOAuthDiscoveryService } from './services/mcp-oauth-discovery.service';
import { TelegramMobileLinkTokenService } from './services/telegram-mobile-link-token.service';
import { TelegramStartCodeService } from './services/telegram-start-code.service';
import { USE_CASES } from './usecases';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    EventsModule,
    ChannelEndpointsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [
    AgentsController,
    AgentsPublicController,
    AgentsWebhookController,
    AgentEmailActionsController,
    AgentsMcpOAuthController,
  ],
  providers: [
    ...USE_CASES,
    AgentRuntimeExceptionFilter,
    AgentMcpServerRepository,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
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
    AgentEmailActionTokenService,
    AgentInboundHandler,
    BridgeExecutorService,
    ManagedAgentProviderFactory,
    ManagedAgentEventHandler,
    ManagedAgentService,
    McpConnectionVaultService,
    DemoClaudeQuotaPolicy,
    ChatInstanceRegistry,
    InboundDispatcher,
    FileMaterializer,
    AgentEmailSender,
    OutboundGateway,
    ChatChannelFactory,
    EmailChannelFactory,
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
