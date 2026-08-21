import { forwardRef, Module } from '@nestjs/common';
import {
  AgentEntitlementsService,
  CalculateDemoClaudeQuota,
  CalculateLimitNovuIntegration,
  CreateOrUpdateSubscriberUseCase,
  RotatingConnectionTokenService,
  UpdateSubscriber,
  UpdateSubscriberChannel,
} from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  AgentToolTrustRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  ContextRepository,
  ConversationActivationRepository,
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
import { IntegrationModule } from '../integrations/integrations.module';
import { KeylessModule } from '../keyless/keyless.module';
import { SharedModule } from '../shared/shared.module';
import { TelegramLinkingModule } from '../telegram-linking/telegram-linking.module';
import { AgentChatController } from './agent-chat/agent-chat.controller';
import { AgentChatEventFactory } from './agent-chat/agent-chat-event.factory';
import { AgentChatLiveActivityPublisher } from './agent-chat/agent-chat-live-activity.publisher';
import { AgentChatPlatformDeliveryService } from './agent-chat/agent-chat-platform-delivery.service';
import { AgentChatPublicationService } from './agent-chat/agent-chat-publication.service';
import { AgentChatResumeAuthorizationService } from './agent-chat/agent-chat-resume-authorization.service';
import { AgentChatSessionVerifier } from './agent-chat/agent-chat-session.verifier';
import { NovuAgentChatProvisioningService } from './channels/agent-chat/find-or-create-novu-agent-chat/find-or-create-novu-agent-chat.service';
import { AgentConfigResolver } from './channels/agent-config-resolver.service';
import { AgentIntegrationsController } from './channels/integrations/agent-integrations.controller';
import { PhotonDeviceAuthBindingService } from './channels/photon-imessage/shared/photon-device-auth-binding.service';
import { AgentsPublicController } from './channels/slack-linking/agents-public.controller';
import { InboundAckService } from './conversation-runtime/ack/inbound-ack.service';
import { AgentActionTokenService } from './conversation-runtime/action-token/agent-action-token.service';
import { AgentAttachmentStorage } from './conversation-runtime/conversation/agent-attachment-storage.service';
import { AgentConversationService } from './conversation-runtime/conversation/agent-conversation.service';
import { AgentSubscriberAdoptionService } from './conversation-runtime/conversation/agent-subscriber-adoption.service';
import { AgentSubscriberResolver } from './conversation-runtime/conversation/agent-subscriber-resolver.service';
import { ConversationActivationService } from './conversation-runtime/conversation/conversation-activation.service';
import { ConversationActivityLedger } from './conversation-runtime/conversation/conversation-activity-ledger.service';
import { ConversationEventSequenceService } from './conversation-runtime/conversation/conversation-event-sequence.service';
import { FileMaterializer } from './conversation-runtime/egress/file-materializer.service';
import { OutboundGateway } from './conversation-runtime/egress/outbound.gateway';
import { OutboundDeliveryInfo } from './conversation-runtime/egress/outbound-delivery-info.service';
import { AgentInboundController } from './conversation-runtime/ingress/agent-inbound.controller';
import { ChatInstanceRegistry } from './conversation-runtime/ingress/chat-instance.registry';
import { InboundDispatcher } from './conversation-runtime/ingress/inbound.dispatcher';
import { InboundConnectionContextResolver } from './conversation-runtime/ingress/inbound-connection-context.resolver';
import { AgentInboundHandler } from './conversation-runtime/ingress/inbound-turn.handler';
import { PlanLimitGateService } from './conversation-runtime/ingress/plan-limit-gate.service';
import { ReplyApprovalInterceptor } from './conversation-runtime/ingress/reply-approval-interceptor.service';
import { WorkflowOriginService } from './conversation-runtime/ingress/workflow-origin.service';
import { ConfirmLinkedAuthCards } from './conversation-runtime/link/confirm-linked-auth-cards.usecase';
import { AgentReplyController } from './conversation-runtime/reply/agent-reply.controller';
import { BridgeRuntime } from './conversation-runtime/runtime/bridge.runtime';
import { BridgeExecutorService } from './conversation-runtime/runtime/bridge-executor.service';
import { BridgeExpireSupersededApprovalsService } from './conversation-runtime/runtime/bridge-expire-superseded-approvals.service';
import { RuntimeResolver } from './conversation-runtime/runtime/runtime-resolver.service';
import { NovuCopilotBridgeModule } from './copilot-bridge/novu-copilot-bridge.module';
import { AgentEmailActionTokenService } from './email/agent-email-action-token.service';
import { AgentEmailActionsController } from './email/agent-email-actions.controller';
import { AgentEmailSender } from './email/agent-email-sender.service';
import { NovuEmailCleanupService } from './email/novu-email/cleanup-novu-email/cleanup-novu-email.service';
import { NovuEmailProvisioningService } from './email/novu-email/find-or-create-novu-email/find-or-create-novu-email.service';
import { AgentRuntimeDefinitionService } from './managed-runtime/agent-runtime-definition.service';
import { DemoClaudeQuotaPolicy } from './managed-runtime/demo-claude-quota-policy.service';
import { ManagedRuntime } from './managed-runtime/managed.runtime';
import { ManagedAgentService } from './managed-runtime/managed-agent.service';
import { ManagedAgentEventHandler } from './managed-runtime/managed-agent-event-handler.service';
import { ManagedAgentProviderFactory } from './managed-runtime/managed-agent-provider-factory.service';
import { ManagedRuntimeController } from './managed-runtime/managed-runtime.controller';
import { ToolTrustService } from './managed-runtime/tool-approval/tool-trust.service';
import { AgentRuntimeController } from './management/agent-runtime.controller';
import { AgentsController } from './management/agents.controller';
import { McpNovuAppCredentialsService } from './mcp/connections/get-mcp-novu-app-credentials/get-mcp-novu-app-credentials.service';
import { McpConnectRedirectService } from './mcp/connections/mcp-connect-redirect.service';
import { McpConnectionVaultService } from './mcp/connections/mcp-connection-vault.service';
import { AgentsMcpOAuthController } from './mcp/oauth/agents-mcp-oauth.controller';
import { McpOAuthDiscoveryService } from './mcp/oauth/mcp-oauth-discovery.service';
import { AgentMcpDefinitionService } from './mcp/runtime/agent-mcp-definition.service';
import { AgentMcpSessionService } from './mcp/runtime/agent-mcp-session.service';
import { AgentChatEnabledGuard } from './shared/agent-chat-enabled.guard';
import { AgentConversationEnabledGuard } from './shared/agent-conversation-enabled.guard';
import { AgentEventSink } from './shared/agent-event-sink.service';
import { AgentRuntimeExceptionFilter } from './shared/agent-runtime-exception.filter';
import { AgentEventsIngestController } from './shared/ingest-agent-events/agent-events-ingest.controller';
import { McpConnectionErrorHandler } from './shared/mcp-connection-error.handler';
import { USE_CASES } from './usecases';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    EventsModule,
    ChannelEndpointsModule,
    ConnectModule,
    KeylessModule,
    TelegramLinkingModule,
    NovuCopilotBridgeModule,
    forwardRef(() => IntegrationModule),
  ],
  controllers: [
    AgentsController,
    AgentIntegrationsController,
    AgentRuntimeController,
    AgentsPublicController,
    AgentInboundController,
    AgentReplyController,
    ManagedRuntimeController,
    AgentEventsIngestController,
    AgentEmailActionsController,
    AgentsMcpOAuthController,
    AgentChatController,
  ],
  providers: [
    ...USE_CASES,
    AgentRuntimeExceptionFilter,
    AgentMcpServerRepository,
    AgentToolTrustRepository,
    ChannelConnectionRepository,
    ChannelEndpointRepository,
    CommunityOrganizationRepository,
    ContextRepository,
    ConversationRepository,
    ConversationActivationRepository,
    ConversationActivityRepository,
    IntegrationRepository,
    McpConnectionRepository,
    MessageRepository,
    SubscriberRepository,
    AgentAttachmentStorage,
    AgentConfigResolver,
    RotatingConnectionTokenService,
    AgentSubscriberResolver,
    AgentSubscriberAdoptionService,
    AgentConversationService,
    ConversationActivityLedger,
    ConversationEventSequenceService,
    ConfirmLinkedAuthCards,
    ConversationActivationService,
    InboundAckService,
    AgentEmailActionTokenService,
    AgentActionTokenService,
    PhotonDeviceAuthBindingService,
    AgentInboundHandler,
    WorkflowOriginService,
    ReplyApprovalInterceptor,
    BridgeExecutorService,
    BridgeExpireSupersededApprovalsService,
    BridgeRuntime,
    ManagedRuntime,
    RuntimeResolver,
    ManagedAgentProviderFactory,
    ManagedAgentEventHandler,
    AgentEventSink,
    McpConnectionErrorHandler,
    ManagedAgentService,
    ToolTrustService,
    McpConnectionVaultService,
    McpConnectRedirectService,
    AgentMcpDefinitionService,
    AgentRuntimeDefinitionService,
    AgentMcpSessionService,
    NovuEmailCleanupService,
    NovuEmailProvisioningService,
    NovuAgentChatProvisioningService,
    AgentChatPublicationService,
    AgentChatSessionVerifier,
    AgentChatResumeAuthorizationService,
    AgentChatEventFactory,
    AgentChatPlatformDeliveryService,
    AgentChatLiveActivityPublisher,
    OutboundDeliveryInfo,
    McpNovuAppCredentialsService,
    DemoClaudeQuotaPolicy,
    ChatInstanceRegistry,
    InboundDispatcher,
    InboundConnectionContextResolver,
    FileMaterializer,
    AgentEmailSender,
    OutboundGateway,
    McpOAuthDiscoveryService,
    CalculateLimitNovuIntegration,
    CalculateDemoClaudeQuota,
    CreateOrUpdateSubscriberUseCase,
    UpdateSubscriber,
    UpdateSubscriberChannel,
    AgentEntitlementsService,
    PlanLimitGateService,
    AgentConversationEnabledGuard,
    AgentChatEnabledGuard,
  ],
  exports: [...USE_CASES, ChatInstanceRegistry, InboundDispatcher, OutboundGateway, ConfirmLinkedAuthCards],
})
export class AgentsModule {}
